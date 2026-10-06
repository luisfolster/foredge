import { buildApp } from "./app.js";
import { openDatabase } from "./db.js";
import { deliverDue } from "./webhook-worker.js";

const port = Number(process.env.PORT ?? 3100);
const db = openDatabase();
const app = await buildApp(db);

let working = false;
const worker = setInterval(async () => {
  if (working) return;
  working = true;
  try {
    while (await deliverDue(db)) {
      // Drain due deliveries; each claim is exclusive across API processes.
    }
  } catch (error) {
    app.log.error({ err: error }, "Webhook delivery failed");
  } finally {
    working = false;
  }
}, 5000);

app.addHook("onClose", async () => clearInterval(worker));

try {
  await app.listen({ host: "0.0.0.0", port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
