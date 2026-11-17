import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL to the PostgreSQL database to migrate.");

// All Kipivo migrators hold the same session lock while applying schema changes.
const migrationLock = 0x4b495049;
const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 2500 });
try {
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1::bigint)", [migrationLock]);
    await migrate(drizzle(client), {
      migrationsFolder: fileURLToPath(new URL("../drizzle/", import.meta.url)),
    });
    console.log("Database migrations applied.");
  } finally {
    // Destroy the session to release its lock, including when a migration fails.
    client.release(true);
  }
} finally {
  await pool.end();
}
