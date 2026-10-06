# API reference

The base URL for the local API is `http://localhost:3100`. Domain endpoints use the `/v1` prefix. The [OpenAPI 3.1 contract](../openapi.json) is generated from the Fastify route schemas during the build; it contains the detailed request and response schemas.

| Method   | Path                                               | Purpose                                             | Key         |
| -------- | -------------------------------------------------- | --------------------------------------------------- | ----------- |
| `GET`    | `/health`                                          | Check the API process                               | No          |
| `GET`    | `/openapi.json`                                    | Get the live OpenAPI contract                       | No          |
| `POST`   | `/v1/projects`                                     | Create a project                                    | Write       |
| `GET`    | `/v1/projects`                                     | List projects                                       | No          |
| `GET`    | `/v1/projects/{slug}`                              | Get a project                                       | No          |
| `POST`   | `/v1/projects/{slug}/releases`                     | Create a draft                                      | Write       |
| `GET`    | `/v1/projects/{slug}/releases`                     | List published releases; `status=draft` needs a key | Conditional |
| `GET`    | `/v1/projects/{slug}/releases/{releaseId}`         | Get a release; drafts need a key                    | Conditional |
| `PATCH`  | `/v1/projects/{slug}/releases/{releaseId}`         | Edit a draft                                        | Write       |
| `POST`   | `/v1/projects/{slug}/releases/{releaseId}/publish` | Publish a draft                                     | Write       |
| `POST`   | `/v1/projects/{slug}/webhooks`                     | Create a subscription                               | Write       |
| `GET`    | `/v1/projects/{slug}/webhooks`                     | List subscriptions                                  | Read        |
| `DELETE` | `/v1/projects/{slug}/webhooks/{subscriptionId}`    | Disable a subscription                              | Write       |

`POST /v1/projects` takes `slug`, `name`, and optional `description`. A release draft takes `version`, `title`, `summary`, and `body`. IDs are UUIDs. Webhook subscription creation takes an HTTPS `url` and returns the signing secret only in its `201` response.

The `GET` list endpoints return an object with `data` and `pagination`, except webhook subscriptions, which return an array. All responses include `x-request-id`. Error bodies have a consistent `error` object, described in [Errors](./errors.md).

The OpenAPI document is generated from code so endpoint and schema changes have one source. Handwritten guides explain workflows and limits that are harder to learn from a schema alone.
