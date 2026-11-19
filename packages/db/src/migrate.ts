import { log } from "@kipivo/logger";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// All Kipivo migrators hold the same session lock while applying schema changes.
const migrationLock = 0x4b495049;

export async function runMigrations(databaseUrl: string, migrationsFolder: string) {
  // Drizzle starts its own transaction. Keep the lock and that transaction on one
  // dedicated session, and never reconnect a migrator that has lost its lock.
  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 2.5,
    idle_timeout: 0,
    max_lifetime: 0,
    onclose: () => {
      void sql.end();
    },
  });
  try {
    await sql`select pg_advisory_lock(${migrationLock}::bigint)`;
    await migrate(drizzle(sql), { migrationsFolder });
    log.info({ action: "postgres.migrations_applied", message: "Database migrations applied." });
  } finally {
    await sql.end(); // Closing the session releases its lock even on rollback.
  }
}
