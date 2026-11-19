import { authEnv, resolveAuthSettings } from "@kipivo/auth/env";
import { cacheEnv, parseRedisUrl } from "@kipivo/cache/env";
import { dbEnv } from "@kipivo/db/env";
import { type createEnv, type Preset, z } from "@kipivo/env";
import { resolveStorageConfig, storageEnv } from "@kipivo/storage/env";

export const apiEnv = {
  id: "api",
  extends: [dbEnv, authEnv, storageEnv, cacheEnv],
  server: {
    DB_MIGRATE_ON_START: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  },
} as const satisfies Preset;

type ApiEnv = ReturnType<typeof createEnv<typeof apiEnv>>;

export function resolveResourceConfig(env: ApiEnv) {
  const { DATABASE_URL: databaseUrl, REDIS_URL: redisUrl } = env;
  const auth = resolveAuthSettings(env, Boolean(databaseUrl));
  const storage = resolveStorageConfig(env);
  if (redisUrl) parseRedisUrl(redisUrl);
  return { databaseUrl, redisUrl, auth, storage };
}

export type ResourceConfig = ReturnType<typeof resolveResourceConfig>;
