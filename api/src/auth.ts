import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { Database } from "./db.js";
import { ApiError } from "./errors.js";

export type KeyScope = "read" | "write";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createKey(db: Database, name: string, scope: KeyScope) {
  const prefix = randomBytes(6).toString("hex");
  const token = `frg_${prefix}_${randomBytes(32).toString("base64url")}`;
  await db`
    INSERT INTO api_keys (id, name, prefix, token_hash, scope)
    VALUES (${randomUUID()}, ${name}, ${prefix}, ${tokenHash(token)}, ${scope})
  `;
  return { prefix, token };
}

export async function requireKey(
  db: Database,
  request: FastifyRequest,
  scope: KeyScope,
) {
  const match = /^Bearer (frg_([0-9a-f]{12})_[A-Za-z0-9_-]+)$/.exec(
    request.headers.authorization ?? "",
  );
  if (!match) {
    throw new ApiError(
      401,
      "authentication_required",
      "Provide a valid API key as a Bearer token.",
    );
  }

  const [key] = await db`
    SELECT token_hash, scope FROM api_keys
    WHERE prefix = ${match[2]} AND revoked_at IS NULL
  `;
  const suppliedHash = Buffer.from(tokenHash(match[1]), "hex");
  const storedHash = Buffer.from(key?.token_hash ?? "0".repeat(64), "hex");
  if (!timingSafeEqual(suppliedHash, storedHash) || !key) {
    throw new ApiError(
      401,
      "invalid_api_key",
      "The API key is invalid or revoked.",
    );
  }

  if (scope === "write" && key.scope !== "write") {
    throw new ApiError(
      403,
      "insufficient_scope",
      "This API key does not allow write operations.",
    );
  }
}
