import postgres from "postgres";

export type Database = ReturnType<typeof postgres>;

export function openDatabase(url = process.env.DATABASE_URL): Database {
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Copy .env.example to .env first.",
    );
  }

  return postgres(url, { max: 5 });
}
