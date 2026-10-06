# Publish a release

A release is created as a draft. Drafts can be edited; published releases cannot. The body is stored as text, so clients decide how to render it.

After creating `tavern-ledger` in the [Quickstart](../quickstart.md), create a draft with a write key:

```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = @{
  version = "2.4.0"
  title = "Encounter builder"
  summary = "Create encounters for a party before the session."
  body = "The encounter builder now groups creatures by initiative."
} | ConvertTo-Json
$release = Invoke-RestMethod -Method Post -Uri http://localhost:3100/v1/projects/tavern-ledger/releases -Headers $headers -ContentType application/json -Body $body
```

Change a draft before publishing:

```powershell
Invoke-RestMethod -Method Patch -Uri "http://localhost:3100/v1/projects/tavern-ledger/releases/$($release.id)" -Headers $headers -ContentType application/json -Body '{"summary":"Plan encounters and track initiative for a party."}'
```

`PATCH` accepts one or more of `version`, `title`, `summary`, and `body`. A version must be unique within its project. Foredge does not interpret semantic version numbers; `2.4.0` is a label supplied by the client.

Publish the draft:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3100/v1/projects/tavern-ledger/releases/$($release.id)/publish" -Headers $headers -ContentType application/json -Body '{}'
```

The response has `status: published` and a `published_at` timestamp. Publishing queues one event per active webhook subscription in the same database transaction. A retry of this publish request returns the published release without creating another event. Editing it afterward returns `409 release_published`.

Creating the same version twice returns `409 release_exists`. There is no `Idempotency-Key` header for creation: if a client loses a create response, list releases with `status=draft&version=2.4.0` using a key before deciding whether to retry.
