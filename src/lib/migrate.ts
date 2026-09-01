import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "./env";

export async function runMigrations(): Promise<void> {
  const client = postgres(env.DATABASE_URL, { max: 1 });
  try {
    await client`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
    await migrate(drizzle(client), {
      migrationsFolder: join(process.cwd(), "drizzle"),
    });
  } finally {
    await client.end();
  }
}
