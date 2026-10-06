import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { createKey } from "../src/auth.js";
import { openDatabase, type Database } from "../src/db.js";
import { migrate } from "../src/migrations.js";
import { deliverDue } from "../src/webhook-worker.js";

const testUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://foredge:change-this-local-password@localhost:5434/foredge_test";

if (new URL(testUrl).pathname !== "/foredge_test") {
  throw new Error("Tests require an isolated foredge_test database.");
}

describe("project and release workflow", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let db: Database;
  let token: string;

  beforeEach(async () => {
    process.env.WEBHOOK_SIGNING_KEY = "a".repeat(64);
    process.env.WEBHOOK_ALLOWED_HOSTS = "hooks.tavern-ledger.test";
    db = openDatabase(testUrl);
    await migrate(db);
    await db`TRUNCATE releases, projects, api_keys CASCADE`;
    token = (await createKey(db, "integration test", "write")).token;
    app = await buildApp(db, { logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  async function createProject() {
    return app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: { authorization: `Bearer ${token}` },
      payload: { slug: "tavern-ledger", name: "Tavern Ledger" },
    });
  }

  it("rejects unauthenticated writes and duplicate projects", async () => {
    const unauthorized = await app.inject({
      method: "POST",
      url: "/v1/projects",
      payload: { slug: "tavern-ledger", name: "Tavern Ledger" },
    });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json().error.request_id).toBeTruthy();

    expect((await createProject()).statusCode).toBe(201);
    const duplicate = await createProject();
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe("project_exists");
  });

  it("keeps drafts private, publishes once, and lists the published release", async () => {
    await createProject();
    const created = await app.inject({
      method: "POST",
      url: "/v1/projects/tavern-ledger/releases",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        version: "2.4.0",
        title: "Encounter builder",
        summary: "Create encounters for a party before the session.",
        body: "The encounter builder now groups creatures by initiative.",
      },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;

    const hidden = await app.inject({
      method: "GET",
      url: `/v1/projects/tavern-ledger/releases/${id}`,
    });
    expect(hidden.statusCode).toBe(401);
    const drafts = await app.inject({
      method: "GET",
      url: "/v1/projects/tavern-ledger/releases?status=draft",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(drafts.json().data).toHaveLength(1);

    const first = await app.inject({
      method: "POST",
      url: `/v1/projects/tavern-ledger/releases/${id}/publish`,
      headers: { authorization: `Bearer ${token}` },
    });
    const retry = await app.inject({
      method: "POST",
      url: `/v1/projects/tavern-ledger/releases/${id}/publish`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().status).toBe("published");
    expect(retry.json().published_at).toBe(first.json().published_at);

    const publicList = await app.inject({
      method: "GET",
      url: "/v1/projects/tavern-ledger/releases?limit=1",
    });
    expect(publicList.statusCode).toBe(200);
    expect(publicList.json().data).toHaveLength(1);
    expect(publicList.json().pagination).toEqual({
      limit: 1,
      offset: 0,
      total: 1,
      next_offset: null,
    });

    const edit = await app.inject({
      method: "PATCH",
      url: `/v1/projects/tavern-ledger/releases/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Changed" },
    });
    expect(edit.statusCode).toBe(409);
  });

  it("serves an OpenAPI contract for the implemented routes", async () => {
    const response = await app.inject({ method: "GET", url: "/openapi.json" });
    expect(response.statusCode).toBe(200);
    expect(
      response.json().paths["/v1/projects/{slug}/releases/{releaseId}/publish"],
    ).toBeTruthy();
    expect(response.json().components.securitySchemes.apiKey.scheme).toBe(
      "bearer",
    );
  });

  it("returns retry information when the rate limit is reached", async () => {
    await app.close();
    app = await buildApp(openDatabase(testUrl), {
      logger: false,
      rateLimitMax: 2,
    });
    await app.inject({ method: "GET", url: "/health" });
    await app.inject({ method: "GET", url: "/health" });
    const limited = await app.inject({ method: "GET", url: "/health" });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers["retry-after"]).toBeTruthy();
    expect(limited.json().error.code).toBe("rate_limited");
  });

  it("enqueues one signed webhook and retries a failed delivery", async () => {
    await createProject();
    const subscription = await app.inject({
      method: "POST",
      url: "/v1/projects/tavern-ledger/webhooks",
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "https://hooks.tavern-ledger.test/releases" },
    });
    expect(subscription.statusCode).toBe(201);
    const secret = subscription.json().secret;
    expect(secret).toMatch(/^frgwh_/);

    const created = await app.inject({
      method: "POST",
      url: "/v1/projects/tavern-ledger/releases",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        version: "2.4.0",
        title: "Encounter builder",
        summary: "Create encounters for a party before the session.",
        body: "The encounter builder now groups creatures by initiative.",
      },
    });
    const publishUrl = `/v1/projects/tavern-ledger/releases/${created.json().id}/publish`;
    await app.inject({
      method: "POST",
      url: publishUrl,
      headers: { authorization: `Bearer ${token}` },
    });
    await app.inject({
      method: "POST",
      url: publishUrl,
      headers: { authorization: `Bearer ${token}` },
    });
    const [count] =
      await db`SELECT count(*)::int AS total FROM webhook_deliveries`;
    expect(count.total).toBe(1);

    const failed = await deliverDue(
      db,
      async () => new Response("unavailable", { status: 503 }),
    );
    expect(failed).toBe(true);
    let [delivery] = await db`SELECT * FROM webhook_deliveries`;
    expect(delivery.status).toBe("pending");
    expect(delivery.attempts).toBe(1);

    await db`UPDATE webhook_deliveries SET next_attempt_at = now()`;
    const received: { body?: string; headers?: Headers } = {};
    await deliverDue(db, async (_url, init) => {
      received.body = String(init?.body);
      received.headers = new Headers(init?.headers);
      return new Response(null, { status: 204 });
    });
    [delivery] = await db`SELECT * FROM webhook_deliveries`;
    expect(delivery.status).toBe("delivered");
    expect(JSON.parse(received.body ?? "").type).toBe("release.published");
    const timestamp = received.headers?.get("x-foredge-timestamp");
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${received.body}`)
      .digest("hex");
    expect(received.headers?.get("x-foredge-signature")).toBe(
      `sha256=${signature}`,
    );

    const listed = await app.inject({
      method: "GET",
      url: "/v1/projects/tavern-ledger/webhooks",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listed.json()[0].secret).toBeUndefined();
  });

  it("rejects read-only keys on writes and invalid webhook destinations", async () => {
    const readToken = (await createKey(db, "reader", "read")).token;
    const denied = await app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: { authorization: `Bearer ${readToken}` },
      payload: { slug: "tavern-ledger", name: "Tavern Ledger" },
    });
    expect(denied.statusCode).toBe(403);
    await createProject();
    const invalid = await app.inject({
      method: "POST",
      url: "/v1/projects/tavern-ledger/webhooks",
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "http://localhost:9000/hook" },
    });
    expect(invalid.statusCode).toBe(422);
  });

  it("reports unsupported request content types as client errors", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/projects/tavern-ledger/releases/00000000-0000-4000-8000-000000000000/publish",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      payload: "",
    });
    expect(response.statusCode).toBe(415);
    expect(response.json().error.code).toBe("unsupported_media_type");
  });
});
