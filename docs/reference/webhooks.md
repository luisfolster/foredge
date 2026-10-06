# Webhook payloads and delivery

Foredge currently emits one event type: `release.published`. A publish operation stores pending deliveries in the same transaction that changes the release status. The API response does not wait for remote endpoints.

Example payload for Tavern Ledger (IDs and timestamps are illustrative):

```json
{
  "id": "ca154dd2-6bb7-421d-9c95-f39488269319",
  "type": "release.published",
  "created_at": "2026-10-06T16:00:00.000Z",
  "data": {
    "project": {
      "id": "a729d1cb-3cd5-42cb-a62c-547ff12518f9",
      "slug": "tavern-ledger"
    },
    "release": {
      "id": "9efbc242-0653-43ba-8aac-2f3e671c0c1d",
      "project_id": "a729d1cb-3cd5-42cb-a62c-547ff12518f9",
      "version": "2.4.0",
      "title": "Encounter builder",
      "summary": "Create encounters for a party before the session.",
      "body": "The encounter builder now groups creatures by initiative.",
      "status": "published",
      "published_at": "2026-10-06T16:00:00.000Z",
      "created_at": "2026-10-06T15:50:00.000Z",
      "updated_at": "2026-10-06T16:00:00.000Z"
    }
  }
}
```

Actual IDs and timestamps come from the server. The payload's `id` identifies the event; `x-foredge-delivery` identifies one subscription delivery and stays the same across retries.

## Headers and signature

| Header                | Value                                              |
| --------------------- | -------------------------------------------------- |
| `content-type`        | `application/json`                                 |
| `x-foredge-event`     | `release.published`                                |
| `x-foredge-delivery`  | Delivery UUID                                      |
| `x-foredge-timestamp` | Unix time in seconds, generated for this attempt   |
| `x-foredge-signature` | `sha256=` followed by a lowercase hexadecimal HMAC |

Compute `HMAC-SHA256(secret, timestamp + "." + raw_request_body)`. Compare digest bytes in constant time and reject timestamps more than five minutes from your clock. Verify the **raw bytes before parsing JSON**; re-serializing JSON changes the signed input. The [Node.js receiver example](https://github.com/luisfolster/foredge/blob/main/examples/webhook-receiver.mjs) implements this check.

## Retries and failure state

The API worker checks for due deliveries about every five seconds. It waits up to ten seconds for a response, does not follow redirects, and accepts any `2xx` status as success. On a network failure or non-`2xx` status it retries after 10, 30, and 90 seconds. After four failed attempts it marks the delivery failed; there is no replay endpoint in this version. A worker that stops while sending leaves a two-minute lease, after which another worker may retry. Delivery is therefore **at least once**: receivers should deduplicate by `x-foredge-delivery` or event `id`.

Disabling a subscription prevents new deliveries and marks its queued deliveries failed. Subscription URLs must use an allowed HTTPS host. The operator configures that allowlist through `WEBHOOK_ALLOWED_HOSTS`.
