import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { openDatabase } from "../src/db.js";

describe("GET /health", () => {
  it("returns a healthy response", async () => {
    const app = await buildApp(
      openDatabase("postgresql://foredge:unused@localhost:5434/foredge_test"),
      { logger: false },
    );
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    await app.close();
  });
});
