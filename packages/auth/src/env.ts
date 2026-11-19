import { createEnv, EnvError, parseHttpOrigin, z, type Preset } from "@kipivo/env";

export const authEnv = {
  id: "auth",
  server: {
    BETTER_AUTH_URL: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().optional(),
  },
} as const satisfies Preset;

export const envs = () => createEnv(authEnv);

export function resolveAuthSettings(
  { BETTER_AUTH_URL, BETTER_AUTH_SECRET }: ReturnType<typeof envs>,
  hasDatabase: boolean,
) {
  if (!hasDatabase && !BETTER_AUTH_URL && !BETTER_AUTH_SECRET) return null;
  if (!hasDatabase || !BETTER_AUTH_URL || !BETTER_AUTH_SECRET) {
    throw new EnvError("Set DATABASE_URL, BETTER_AUTH_URL, and BETTER_AUTH_SECRET together.");
  }

  const baseURL = parseHttpOrigin(BETTER_AUTH_URL);
  if (!baseURL) throw new EnvError("BETTER_AUTH_URL must be the public Web HTTP(S) origin.");
  validateAuthSecret(BETTER_AUTH_SECRET);

  return {
    baseURL,
    secret: BETTER_AUTH_SECRET,
  };
}

export function validateAuthSecret(secret: string): void {
  if (secret.length < 32) throw new EnvError("BETTER_AUTH_SECRET must be at least 32 characters.");
}
