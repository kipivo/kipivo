import { createAuth } from "@kipivo/auth/server";
import { createDatabase } from "@kipivo/db/client";

function createRuntime(env: NodeJS.ProcessEnv) {
  const { DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET } = env;
  if (!DATABASE_URL && !BETTER_AUTH_URL && !BETTER_AUTH_SECRET) return undefined;
  if (!DATABASE_URL || !BETTER_AUTH_URL || !BETTER_AUTH_SECRET) {
    throw new Error("Set DATABASE_URL, BETTER_AUTH_URL, and BETTER_AUTH_SECRET together.");
  }

  const url = URL.parse(BETTER_AUTH_URL);
  if (!url || url.href !== `${url.origin}/` || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("BETTER_AUTH_URL must be the public Web HTTP(S) origin.");
  }

  const database = createDatabase(DATABASE_URL);
  return {
    auth: createAuth({ database: database.db, baseURL: url.origin, secret: BETTER_AUTH_SECRET }),
    ready: database.ready,
    close: database.close,
  };
}

export const runtime = createRuntime(process.env);
