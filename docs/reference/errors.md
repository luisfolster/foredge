# Errors

Foredge uses one JSON shape for errors. The `request_id` matches the `x-request-id` response header and the request identifier in server logs.

```json
{
  "error": {
    "code": "release_exists",
    "message": "Release 2.4.0 already exists for this project.",
    "request_id": "req-7"
  }
}
```

| HTTP status | Common code                                                                      | When it occurs                                                            |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `400`       | `bad_request`                                                                    | The server cannot parse the request, for example malformed JSON.          |
| `401`       | `authentication_required`, `invalid_api_key`                                     | A key is required, missing, invalid, or revoked.                          |
| `403`       | `insufficient_scope`                                                             | A valid read key attempts a write.                                        |
| `404`       | `route_not_found`, `project_not_found`, `release_not_found`, `webhook_not_found` | The route or requested resource does not exist.                           |
| `409`       | `project_exists`, `release_exists`, `release_published`                          | A unique value already exists or a published release is edited.           |
| `413`       | `payload_too_large`                                                              | The request body exceeds the server limit.                                |
| `415`       | `unsupported_media_type`                                                         | A request body uses a content type the API does not accept.               |
| `422`       | `invalid_request`, `invalid_webhook_url`                                         | A request fails schema validation or a webhook destination is disallowed. |
| `429`       | `rate_limited`                                                                   | The per-IP request limit is reached. Read `retry-after`.                  |
| `500`       | `internal_error`                                                                 | An unexpected server failure; details remain in server logs.              |
| `503`       | `webhooks_not_configured`                                                        | Webhook signing is not configured on the server.                          |

For example, creating a second Tavern Ledger release with version `2.4.0` returns `409` and `release_exists`. The code is stable for programmatic handling; the message is written for people and may be refined without changing the code.

If an unexpected error occurs, report the request ID and the operation you attempted. Do not include your API key or webhook secret in a bug report.
