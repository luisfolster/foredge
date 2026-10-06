# Rate limits

By default, one client IP can make 60 requests per minute across API endpoints, including public reads and `/health`. The operator can change the limit with `RATE_LIMIT_MAX`. The counter is kept in each API process's memory and resets when that process restarts; it is not a distributed quota.

Responses include:

| Header                  | Meaning                                 |
| ----------------------- | --------------------------------------- |
| `x-ratelimit-limit`     | Maximum requests in the window.         |
| `x-ratelimit-remaining` | Requests left in the current window.    |
| `x-ratelimit-reset`     | Seconds until the window resets.        |
| `retry-after`           | Seconds to wait after a `429` response. |

After the limit is reached, Foredge returns `429 rate_limited` in the [standard error shape](./errors.md). A client should wait at least the `retry-after` value before retrying. The limit uses the direct peer IP; Foredge does not trust arbitrary forwarded-IP headers. Running multiple API processes creates separate counters, so this mechanism is suitable for the local demonstration, not a shared production quota.
