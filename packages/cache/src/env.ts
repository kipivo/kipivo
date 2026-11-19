import { createEnv, EnvError, z, type Preset } from "@kipivo/env";

export const cacheEnv = {
  id: "cache",
  server: {
    REDIS_URL: z.string().optional(),
  },
} as const satisfies Preset;

export const envs = () => createEnv(cacheEnv);

export function parseRedisUrl(connectionString: string) {
  const url = URL.parse(connectionString);
  if (
    !url ||
    !["redis:", "rediss:"].includes(url.protocol) ||
    !url.hostname ||
    url.port === "0" ||
    url.search ||
    url.hash ||
    (url.pathname !== "" && !/^\/(?:\d+)?$/.test(url.pathname)) ||
    !Number.isSafeInteger(Number(url.pathname.slice(1)))
  ) {
    throw new EnvError("REDIS_URL must be a Redis TCP URL using redis:// or rediss://.");
  }

  try {
    return {
      url,
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  } catch {
    throw new EnvError("REDIS_URL has malformed URL credentials.");
  }
}
