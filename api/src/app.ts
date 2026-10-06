import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import Fastify from "fastify";
import { openDatabase, type Database } from "./db.js";
import { installErrorHandler } from "./errors.js";
import { registerProjects } from "./projects.js";
import { registerReleases } from "./releases.js";
import { registerWebhooks } from "./webhooks.js";

export async function buildApp(
  db: Database = openDatabase(),
  options: { logger?: boolean; rateLimitMax?: number } = {},
) {
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            redact: ["req.headers.authorization", "headers.authorization"],
          },
  });

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Foredge API",
        version: "0.1.0",
        description: "Store and publish release notes for software projects.",
      },
      components: {
        securitySchemes: { apiKey: { type: "http", scheme: "bearer" } },
      },
    },
  });
  await app.register(rateLimit, {
    global: true,
    max: options.rateLimitMax ?? Number(process.env.RATE_LIMIT_MAX ?? 60),
    timeWindow: "1 minute",
  });

  installErrorHandler(app);

  app.addHook("onRequest", (request, reply, done) => {
    reply.header("x-request-id", request.id);
    done();
  });

  app.get(
    "/health",
    {
      schema: {
        tags: ["Operations"],
        summary: "Check whether the API process is running",
        response: {
          200: {
            type: "object",
            required: ["status"],
            properties: { status: { type: "string", enum: ["ok"] } },
          },
        },
      },
    },
    async () => ({ status: "ok" }),
  );
  app.get("/openapi.json", { schema: { hide: true } }, async () =>
    app.swagger(),
  );

  registerProjects(app, db);
  registerReleases(app, db);
  registerWebhooks(app, db);

  app.addHook("onClose", async () => db.end());

  return app;
}
