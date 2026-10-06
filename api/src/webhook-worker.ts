import { createHmac } from "node:crypto";
import type { Database } from "./db.js";
import { webhookSecret } from "./webhooks.js";

export async function deliverDue(db: Database, send: typeof fetch = fetch) {
  const [delivery] = await db`
    WITH picked AS (
      SELECT d.id FROM webhook_deliveries d
      JOIN webhook_subscriptions s ON s.id = d.subscription_id
      WHERE s.disabled_at IS NULL AND (
        (d.status = 'pending' AND d.next_attempt_at <= now()) OR
        (d.status = 'sending' AND d.lease_until <= now())
      )
      ORDER BY d.next_attempt_at, d.id
      FOR UPDATE OF d SKIP LOCKED LIMIT 1
    )
    UPDATE webhook_deliveries d
    SET status = 'sending', attempts = d.attempts + 1,
        lease_until = now() + interval '2 minutes'
    FROM picked WHERE d.id = picked.id
    RETURNING d.*
  `;
  if (!delivery) return false;

  const [subscription] = await db`
    SELECT url, disabled_at FROM webhook_subscriptions WHERE id = ${delivery.subscription_id}
  `;
  if (!subscription || subscription.disabled_at) {
    await db`UPDATE webhook_deliveries SET status = 'failed', lease_until = NULL WHERE id = ${delivery.id}`;
    return true;
  }

  const body = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac(
    "sha256",
    webhookSecret(delivery.subscription_id),
  )
    .update(`${timestamp}.${body}`)
    .digest("hex");
  let responseStatus: number | null = null;
  try {
    const response = await send(subscription.url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: {
        "content-type": "application/json",
        "x-foredge-event": delivery.event_type,
        "x-foredge-delivery": delivery.id,
        "x-foredge-timestamp": timestamp,
        "x-foredge-signature": `sha256=${signature}`,
      },
      body,
    });
    responseStatus = response.status;
  } catch {
    // Network failures follow the same retry path as non-2xx responses.
  }

  if (
    responseStatus !== null &&
    responseStatus >= 200 &&
    responseStatus < 300
  ) {
    await db`
      UPDATE webhook_deliveries SET status = 'delivered', lease_until = NULL,
        last_status = ${responseStatus}, delivered_at = now()
      WHERE id = ${delivery.id} AND status = 'sending'
    `;
  } else {
    const failed = delivery.attempts >= 4;
    const delay = [10, 30, 90][delivery.attempts - 1] ?? 90;
    await db`
      UPDATE webhook_deliveries SET status = ${failed ? "failed" : "pending"},
        lease_until = NULL, last_status = ${responseStatus},
        next_attempt_at = now() + (${delay} * interval '1 second')
      WHERE id = ${delivery.id} AND status = 'sending'
    `;
  }
  return true;
}
