export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { runMigrations } = await import("./lib/migrate");
      await runMigrations();
    } catch (error) {
      console.error("[MIGRATION_ERROR] Failed to run database migrations:", error);
    }
  }
}
