import { openDatabase } from "./db.js";
import { migrate } from "./migrations.js";

const db = openDatabase();

try {
  await migrate(db);
  console.log("Database migrations applied.");
} finally {
  await db.end();
}
