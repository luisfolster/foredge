# Receive your first webhook

Foredge sends `release.published` after a subscribed project's draft becomes published. Delivery runs in the API process. A subscription created after publication will not receive past events.

## 1. Prepare an HTTPS destination

Start the [example receiver](https://github.com/luisfolster/foredge/blob/main/examples/webhook-receiver.mjs) with Node.js 24. It listens on `http://127.0.0.1:4100/webhooks`. Expose that local port through an HTTPS tunnel you control. The public URL must forward the original request body and headers.

The local receiver is HTTP because TLS terminates at the tunnel. Foredge only accepts HTTPS subscription URLs and an operator-configured host allowlist. It refuses IP literals, `localhost`, credentials in URLs, non-443 ports, and redirects during delivery.

## 2. Configure Foredge

In `.env`, set `WEBHOOK_ALLOWED_HOSTS` to your tunnel hostname, without `https://` or a path. Set `WEBHOOK_SIGNING_KEY` to 64 random hexadecimal characters. Generate one inside the API container:

```powershell
docker compose exec -T api node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy that value into `.env`, then recreate the API container:

```powershell
docker compose up -d --force-recreate api
```

Keep the signing key private and stable. Changing it invalidates existing subscription secrets. The [development page](../development.md) describes local configuration.

## 3. Subscribe

With a write API key in `$token` and the `tavern-ledger` project already created:

```powershell
$headers = @{ Authorization = "Bearer $token" }
$subscription = Invoke-RestMethod -Method Post -Uri http://localhost:3100/v1/projects/tavern-ledger/webhooks -Headers $headers -ContentType application/json -Body '{"url":"https://YOUR-TUNNEL-HOST/webhooks"}'
$env:FOREDGE_WEBHOOK_SECRET = $subscription.secret
node examples/webhook-receiver.mjs
```

Replace `YOUR-TUNNEL-HOST` with the exact hostname configured in `.env`. The subscription response is the only API response that includes its secret. Keep the receiver running in a separate terminal. A read key can list subscriptions, but the list does not include secrets.

## 4. Publish a new release

Follow [Publish a release](./publishing.md) using a new version, such as `2.4.1`. The receiver prints `release.published: tavern-ledger 2.4.1` after Foredge delivers the event. A `2xx` response marks it delivered. A network error or non-`2xx` response is retried as described in [Webhook payloads and delivery](../reference/webhooks.md).

This guide needs a reachable HTTPS tunnel; GitHub Pages cannot receive webhooks. For testing without a tunnel, the automated test suite injects a fake HTTP sender and checks the exact body, headers, signature, and retry state.
