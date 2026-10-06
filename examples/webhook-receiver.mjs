import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const secret = process.env.FOREDGE_WEBHOOK_SECRET;
if (!secret?.startsWith("frgwh_")) {
  throw new Error(
    "Set FOREDGE_WEBHOOK_SECRET to the secret returned when subscribing.",
  );
}

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/webhooks") {
    response.writeHead(404).end();
    return;
  }

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const timestamp = request.headers["x-foredge-timestamp"];
  const signature = request.headers["x-foredge-signature"];
  const seconds = Number(timestamp);
  if (
    !Number.isSafeInteger(seconds) ||
    Math.abs(Date.now() / 1000 - seconds) > 300
  ) {
    response.writeHead(401).end();
    return;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(body)
    .digest();
  const received =
    typeof signature === "string" && /^sha256=[0-9a-f]{64}$/.test(signature)
      ? Buffer.from(signature.slice(7), "hex")
      : Buffer.alloc(0);
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    response.writeHead(401).end();
    return;
  }

  const event = JSON.parse(body.toString("utf8"));
  console.log(
    `${event.type}: ${event.data.project.slug} ${event.data.release.version}`,
  );
  response.writeHead(204).end();
}).listen(4100, "127.0.0.1", () => {
  console.log("Webhook receiver listening on http://127.0.0.1:4100/webhooks");
});
