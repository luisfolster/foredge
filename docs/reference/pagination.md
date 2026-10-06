# Pagination and filtering

`GET /v1/projects` and `GET /v1/projects/{slug}/releases` use offset pagination. Both accept `limit` and `offset` as query parameters.

| Parameter | Default | Valid range | Meaning                         |
| --------- | ------- | ----------- | ------------------------------- |
| `limit`   | `20`    | `1`–`100`   | Maximum items in this page.     |
| `offset`  | `0`     | `0`–`10000` | Items to skip before this page. |

The response includes the applied values, total matching items, and the next offset or `null`:

```json
{
  "data": [],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 0,
    "next_offset": null
  }
}
```

To fetch the next page, send `offset` equal to `next_offset`, keeping the same filters. Stop when it is `null`. An invalid number or a value outside the allowed range returns `422 invalid_request`.

Release lists accept `status=published` (the default) or `status=draft`. Draft lists require a read or write API key. `version=2.4.0` matches a version exactly and can be combined with either status. A project with no releases returns an empty `data` array and `total: 0`.

Published releases are ordered by publication time descending, then creation time and ID. Projects are ordered by creation time and ID descending. These tie-breakers make a page deterministic for an unchanged dataset, but offset pages can shift when a new release is published between requests. Offset pagination was chosen because this small API needs simple navigation and low volume; clients that need a frozen export should capture the data in one session or account for changes.
