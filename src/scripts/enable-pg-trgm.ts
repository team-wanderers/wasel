import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/db";

async function main() {
  console.log("Enabling pg_trgm extension on PostgreSQL database...");
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  console.log("Extension pg_trgm enabled successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to enable pg_trgm extension:", err);
  process.exit(1);
});
