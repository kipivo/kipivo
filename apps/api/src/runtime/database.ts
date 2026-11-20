import { getDbMigrationEnv } from "@kipivo/db/env";
import { runMigrations } from "@kipivo/db/migrate";
import { configureLogger } from "@kipivo/logger";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function migrateDatabase(databaseUrl: string) {
  const bundled = new URL("./drizzle/", import.meta.url);
  const folder = existsSync(bundled)
    ? bundled
    : new URL("../../../../packages/db/drizzle/", import.meta.url);
  return runMigrations(databaseUrl, fileURLToPath(folder));
}

export async function runDbCommand([command, ...args]: string[]) {
  if (command !== "db:migrate") {
    throw new Error("Unknown database command. Use db:migrate.");
  }
  if (args.length) throw new Error(`Usage: ${command}`);
  configureLogger(command);
  const { DATABASE_URL } = getDbMigrationEnv();
  return migrateDatabase(DATABASE_URL);
}
