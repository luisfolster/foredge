import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildApp } from "./app.js";
import { openDatabase } from "./db.js";

const app = await buildApp(
  openDatabase("postgresql://unused:unused@localhost:5432/unused"),
  {
    logger: false,
  },
);

try {
  await app.ready();
  const destination = resolve("..", "docs", "public", "openapi.json");
  await mkdir(resolve("..", "docs", "public"), { recursive: true });
  await writeFile(destination, `${JSON.stringify(app.swagger(), null, 2)}\n`);
  console.log(`OpenAPI contract written to ${destination}`);
} finally {
  await app.close();
}
