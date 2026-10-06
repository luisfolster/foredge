import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { openDatabase } from "../src/db.js";

it("keeps the static OpenAPI file in sync with route schemas", async () => {
  const app = await buildApp(
    openDatabase("postgresql://unused:unused@localhost:5432/unused"),
    { logger: false },
  );
  try {
    await app.ready();
    const source = await readFile(
      resolve("..", "docs", "public", "openapi.json"),
      "utf8",
    );
    expect(app.swagger()).toEqual(JSON.parse(source));
  } finally {
    await app.close();
  }
});
