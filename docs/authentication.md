# Authentication

Foredge uses API keys for operations that change data and for reading drafts. Public reads of published releases and project metadata do not require a key.

Send a key in the `Authorization` header:

```http
Authorization: Bearer frg_<prefix>_<secret>
```

Generate a key in the running API container:

```powershell
docker compose exec -T api pnpm key:create editorial write
```

The CLI prints the complete key once. Foredge stores a SHA-256 hash of a randomly generated key and a short prefix for identification; it cannot display the original key again. Do not put a key in a URL, source file, issue, or screenshot. The API does not include a user-login system.

## Scopes

| Scope   | Allowed operations                                                              |
| ------- | ------------------------------------------------------------------------------- |
| `read`  | Read drafts and list webhook subscriptions.                                     |
| `write` | Everything `read` allows, plus create or edit projects, releases, and webhooks. |

Create a read-only key with `docker compose exec -T api pnpm key:create reporting read`. A valid read-only key used for a write returns `403 insufficient_scope`. A missing, malformed, or revoked key returns `401` when a key is required.

## Revoke and rotate

```powershell
docker compose exec -T api pnpm key:revoke <12-character-prefix>
```

To rotate, create a new key, update the client, then revoke the old key. Revocation takes effect on the next request. The key prefix is visible in the create command output and in the token itself; the secret part is never returned by the API.

For full request and response shapes, use the [API reference](./reference/api.md). See [Errors](./reference/errors.md) for authentication error bodies.
