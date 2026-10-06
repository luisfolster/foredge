import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Database } from "./db.js";

export async function migrate(db: Database, directory = resolve("migrations")) {
  await db`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`;

  const files = (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const name of files) {
    const contents = await readFile(resolve(directory, name), "utf8");
    const checksum = createHash("sha256").update(contents).digest("hex");
    const [applied] =
      await db`SELECT checksum FROM schema_migrations WHERE name = ${name}`;

    if (applied) {
      if (applied.checksum !== checksum) {
        throw new Error(`Migration ${name} changed after it was applied.`);
      }
      continue;
    }

    await db.begin(async (tx) => {
      await tx.unsafe(contents).simple();
      await tx`INSERT INTO schema_migrations (name, checksum) VALUES (${name}, ${checksum})`;
    });
  }
}
