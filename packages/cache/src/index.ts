import { createCache } from "@kipivo/cache/factory";
import { envs } from "@kipivo/cache/env";

const { REDIS_URL } = envs();
export const cache = REDIS_URL ? createCache(REDIS_URL) : null;
