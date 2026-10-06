import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createKey } from "../api/dist/auth.js";
import { openDatabase } from "../api/dist/db.js";

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { encoding: "utf8", env });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args[0]} failed: ${result.error?.message ?? `exit code ${result.status}`}.`,
    );
  }
  return result.stdout;
}

const db = openDatabase(
  process.env.DATABASE_URL ??
    "postgresql://foredge:change-this-local-password@localhost:5433/foredge",
);
const { token, prefix } = await createKey(db, "smoke", "write");

const slug = `tavern-ledger-${randomBytes(4).toString("hex")}`;
const base = process.env.FOREDGE_BASE_URL ?? "http://localhost:3100";
const headers = {
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
};

async function request(method, path, body, authenticated = true) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: authenticated ? headers : undefined,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`${method} ${path} returned ${response.status}.`);
  return response.json();
}

try {
  await request("POST", "/v1/projects", { slug, name: "Tavern Ledger" });
  const draft = await request("POST", `/v1/projects/${slug}/releases`, {
    version: "2.4.0",
    title: "Encounter builder",
    summary: "Create encounters for a party before the session.",
    body: "The encounter builder now groups creatures by initiative.",
  });
  if (draft.status !== "draft")
    throw new Error("Release did not start as a draft.");
  const published = await request(
    "POST",
    `/v1/projects/${slug}/releases/${draft.id}/publish`,
    {},
  );
  if (published.status !== "published")
    throw new Error("Release was not published.");
  const list = await request(
    "GET",
    `/v1/projects/${slug}/releases`,
    undefined,
    false,
  );
  if (list.data.length !== 1 || list.data[0].version !== "2.4.0") {
    throw new Error("Public listing did not contain the published release.");
  }

  if (process.platform !== "win32") {
    const env = {
      ...process.env,
      FOREDGE_PROJECT_SLUG: slug,
      FOREDGE_BASE_URL: base,
    };
    const jsOutput = run("node", ["examples/list-releases.mjs"], env);
    const pyOutput = run("python3", ["examples/list_releases.py"], env);
    if (
      !jsOutput.includes("2.4.0: Encounter builder") ||
      !pyOutput.includes("2.4.0: Encounter builder")
    ) {
      throw new Error("A published example did not show the release.");
    }
  }
  console.log(
    "Quickstart workflow passed; CI also checks the JavaScript/Python examples.",
  );
} finally {
  await db`UPDATE api_keys SET revoked_at = now() WHERE prefix = ${prefix}`;
  await db.end();
}
