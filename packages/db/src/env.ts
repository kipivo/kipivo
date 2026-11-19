import { createEnv, z, type Preset } from "@kipivo/env";

export const dbEnv = {
  id: "db",
  server: { DATABASE_URL: z.string().optional() },
} as const satisfies Preset;

const databaseUrl = z.url();
const dbInstanceEnv = {
  id: "db-instance",
  extends: [dbEnv],
  server: { DATABASE_URL: databaseUrl.optional() },
} as const satisfies Preset;

const dbMigrationEnv = {
  id: "db-migration",
  extends: [dbInstanceEnv],
  server: { DATABASE_URL: databaseUrl },
} as const satisfies Preset;

export const envs = () => createEnv(dbInstanceEnv);

export function getDbMigrationEnv() {
  return createEnv(dbMigrationEnv);
}
