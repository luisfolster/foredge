import { createKey, type KeyScope } from "./auth.js";
import { openDatabase } from "./db.js";

const [action, argument, scopeArgument] = process.argv.slice(2);
const db = openDatabase();

try {
  if (action === "create") {
    const name = argument?.trim();
    const scope = (scopeArgument ?? "write") as KeyScope;
    if (!name || name.length > 80 || !["read", "write"].includes(scope)) {
      throw new Error("Usage: pnpm key:create <name> [read|write]");
    }
    const { prefix, token } = await createKey(db, name, scope);
    console.log(
      `Key ${prefix} (${scope}) created. Store the token now; it will not be shown again:`,
    );
    console.log(token);
  } else if (action === "revoke") {
    if (!argument || !/^[0-9a-f]{12}$/.test(argument)) {
      throw new Error("Usage: pnpm key:revoke <12-character-prefix>");
    }
    const result = await db`
      UPDATE api_keys SET revoked_at = now()
      WHERE prefix = ${argument} AND revoked_at IS NULL
      RETURNING prefix
    `;
    if (result.length === 0) {
      throw new Error(`Active key ${argument} not found.`);
    }
    console.log(`Key ${argument} revoked.`);
  } else {
    throw new Error(
      "Usage: pnpm key:create <name> [read|write] | pnpm key:revoke <prefix>",
    );
  }
} finally {
  await db.end();
}
