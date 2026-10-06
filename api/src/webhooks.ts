import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import type { FastifyInstance } from "fastify";
import { requireKey } from "./auth.js";
import type { Database } from "./db.js";
import { ApiError } from "./errors.js";
import { findProject } from "./projects.js";
import { errorSchema } from "./schemas.js";

const subscriptionSchema = {
  type: "object",
  required: ["id", "project_id", "url", "created_at", "disabled_at"],
  properties: {
    id: { type: "string", format: "uuid" },
    project_id: { type: "string", format: "uuid" },
    url: { type: "string", format: "uri" },
    created_at: { type: "string", format: "date-time" },
    disabled_at: { type: ["string", "null"], format: "date-time" },
  },
} as const;

function signingMaster() {
  const value = process.env.WEBHOOK_SIGNING_KEY ?? "";
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new ApiError(
      503,
      "webhooks_not_configured",
      "Webhook signing is not configured.",
    );
  }
  return Buffer.from(value, "hex");
}

export function webhookSecret(subscriptionId: string) {
  return `frgwh_${createHmac("sha256", signingMaster()).update(subscriptionId).digest("hex")}`;
}

function validateWebhookUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ApiError(
      422,
      "invalid_webhook_url",
      "Webhook URL must be an absolute HTTPS URL.",
    );
  }
  const allowed = (process.env.WEBHOOK_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    (parsed.port && parsed.port !== "443") ||
    isIP(parsed.hostname.replace(/^\[|\]$/g, "")) !== 0 ||
    parsed.hostname.toLowerCase() === "localhost" ||
    !allowed.includes(parsed.hostname.toLowerCase())
  ) {
    throw new ApiError(
      422,
      "invalid_webhook_url",
      "Webhook URL must use HTTPS and an allowed host.",
    );
  }
  return parsed.toString();
}

export function registerWebhooks(app: FastifyInstance, db: Database) {
  app.post<{ Params: { slug: string }; Body: { url: string } }>(
    "/v1/projects/:slug/webhooks",
    {
      onRequest: (request) => requireKey(db, request, "write"),
      schema: {
        tags: ["Webhooks"],
        summary: "Subscribe to release.published",
        security: [{ apiKey: [] }],
        params: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["url"],
          additionalProperties: false,
          properties: { url: { type: "string", format: "uri" } },
        },
        response: {
          201: {
            ...subscriptionSchema,
            required: [...subscriptionSchema.required, "secret"],
            properties: {
              ...subscriptionSchema.properties,
              secret: { type: "string" },
            },
          },
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          422: errorSchema,
          503: errorSchema,
        },
      },
    },
    async (request, reply) => {
      signingMaster();
      const url = validateWebhookUrl(request.body.url);
      const project = await findProject(db, request.params.slug);
      const id = randomUUID();
      const [subscription] = await db`
      INSERT INTO webhook_subscriptions (id, project_id, url)
      VALUES (${id}, ${project.id}, ${url}) RETURNING *
    `;
      return reply
        .code(201)
        .send({ ...subscription, secret: webhookSecret(id) });
    },
  );

  app.get<{ Params: { slug: string } }>(
    "/v1/projects/:slug/webhooks",
    {
      onRequest: (request) => requireKey(db, request, "read"),
      schema: {
        tags: ["Webhooks"],
        summary: "List webhook subscriptions",
        security: [{ apiKey: [] }],
        params: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string" } },
        },
        response: {
          200: { type: "array", items: subscriptionSchema },
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request) => {
      const project = await findProject(db, request.params.slug);
      return db`SELECT * FROM webhook_subscriptions WHERE project_id = ${project.id} ORDER BY created_at DESC, id DESC`;
    },
  );

  app.delete<{ Params: { slug: string; subscriptionId: string } }>(
    "/v1/projects/:slug/webhooks/:subscriptionId",
    {
      onRequest: (request) => requireKey(db, request, "write"),
      schema: {
        tags: ["Webhooks"],
        summary: "Disable a webhook subscription",
        security: [{ apiKey: [] }],
        params: {
          type: "object",
          required: ["slug", "subscriptionId"],
          properties: {
            slug: { type: "string" },
            subscriptionId: { type: "string", format: "uuid" },
          },
        },
        response: {
          204: { type: "null" },
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          422: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const project = await findProject(db, request.params.slug);
      const [subscription] = await db`
      UPDATE webhook_subscriptions SET disabled_at = now()
      WHERE id = ${request.params.subscriptionId} AND project_id = ${project.id} AND disabled_at IS NULL
      RETURNING id
    `;
      if (!subscription) {
        throw new ApiError(
          404,
          "webhook_not_found",
          "Webhook subscription not found.",
        );
      }
      await db`
      UPDATE webhook_deliveries SET status = 'failed', lease_until = NULL
      WHERE subscription_id = ${subscription.id} AND status IN ('pending', 'sending')
    `;
      return reply.code(204).send();
    },
  );
}
