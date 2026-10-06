# List releases

`GET /v1/projects/{slug}/releases` returns published releases by default. No key is needed for this public view:

```powershell
Invoke-RestMethod "http://localhost:3100/v1/projects/tavern-ledger/releases?limit=10&offset=0"
```

The response contains `data` and `pagination`. To find one version, add `version=2.4.0`. To list drafts, add `status=draft` and send a read or write key:

```powershell
Invoke-RestMethod "http://localhost:3100/v1/projects/tavern-ledger/releases?status=draft" -Headers @{ Authorization = "Bearer $token" }
```

The list is ordered by publish time, then creation time and ID. Newly published releases can shift later pages when offset pagination is used; see [Pagination and filtering](../reference/pagination.md).

Working examples in [JavaScript](https://github.com/luisfolster/foredge/blob/main/examples/list-releases.mjs) and [Python](https://github.com/luisfolster/foredge/blob/main/examples/list_releases.py) perform the public read. They use `http://localhost:3100` and `tavern-ledger` by default; `FOREDGE_BASE_URL` and `FOREDGE_PROJECT_SLUG` can override those values.
