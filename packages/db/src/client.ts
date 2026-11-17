import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export function createDatabase(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 2500,
    idleTimeoutMillis: 30_000,
    query_timeout: 5000,
  });
  pool.on("error", () => console.error("PostgreSQL idle connection failed."));
  const db = drizzle(pool);
  let closing: Promise<void> | undefined;

  return {
    db,
    async ready() {
      if (closing) return false;
      const result = await pool.query<{ ready: boolean }>(`
        SELECT to_regclass('auth_user') IS NOT NULL
          AND to_regclass('auth_session') IS NOT NULL
          AND to_regclass('auth_account') IS NOT NULL
          AND to_regclass('auth_verification') IS NOT NULL AS ready
      `);
      return result.rows[0]?.ready === true;
    },
    close() {
      return (closing ??= pool.end());
    },
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];
