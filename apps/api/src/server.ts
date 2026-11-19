import { createEnv } from "@kipivo/env";
import { configureLogger } from "@kipivo/logger";
import { defineServerEntry } from "nitro";
import { migrateDatabase, runDbCommand } from "./db-command";
import { apiEnv, resolveResourceConfig } from "./env";
import { startRuntime } from "./runtime";

// The built entry also serves one-shot operator commands. Exit before Nitro binds
// a port, and before validating environment variables used only by the HTTP API.
if (process.argv[2]?.startsWith("db:")) {
  await runDbCommand(process.argv.slice(2));
  process.exit(0);
}

configureLogger("api");
const env = createEnv(apiEnv);
const resourceConfig = resolveResourceConfig(env);

if (env.DB_MIGRATE_ON_START) {
  if (!env.DATABASE_URL) {
    throw new Error("DB_MIGRATE_ON_START requires DATABASE_URL.");
  }
  await migrateDatabase(env.DATABASE_URL);
}

const runtime = await startRuntime(resourceConfig);

export default defineServerEntry({ fetch: runtime.fetch, port: 3001 });
