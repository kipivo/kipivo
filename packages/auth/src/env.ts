import { createEnv, EnvError, parseHttpOrigin, z, type Preset } from "@kipivo/env";

export const authEnv = {
  id: "auth",
  server: {
    BETTER_AUTH_URL: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().trim().optional(),
    GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
    GITHUB_CLIENT_ID: z.string().trim().optional(),
    GITHUB_CLIENT_SECRET: z.string().trim().optional(),
  },
} as const satisfies Preset;

export const envs = () => createEnv(authEnv);
type AuthEnv = ReturnType<typeof envs>;

function readOAuthCredentials(env: AuthEnv, provider: "GOOGLE" | "GITHUB") {
  const idKey = `${provider}_CLIENT_ID` as const;
  const secretKey = `${provider}_CLIENT_SECRET` as const;
  const clientId = env[idKey];
  const clientSecret = env[secretKey];
  if (!clientId && !clientSecret) return undefined;
  if (!clientId || !clientSecret) throw new EnvError(`Set ${idKey} and ${secretKey} together.`);
  return { clientId, clientSecret };
}

export function resolveAuthSettings(env: AuthEnv, hasDatabase: boolean) {
  const { BETTER_AUTH_URL, BETTER_AUTH_SECRET } = env;
  const google = readOAuthCredentials(env, "GOOGLE");
  const github = readOAuthCredentials(env, "GITHUB");

  if (!hasDatabase && !BETTER_AUTH_URL && !BETTER_AUTH_SECRET && !google && !github) return null;
  if (!hasDatabase || !BETTER_AUTH_URL || !BETTER_AUTH_SECRET) {
    throw new EnvError("Set DATABASE_URL, BETTER_AUTH_URL, and BETTER_AUTH_SECRET together.");
  }

  const baseURL = parseHttpOrigin(BETTER_AUTH_URL);
  if (!baseURL) throw new EnvError("BETTER_AUTH_URL must be the public Web HTTP(S) origin.");
  validateAuthSecret(BETTER_AUTH_SECRET);

  return {
    baseURL,
    secret: BETTER_AUTH_SECRET,
    socialProviders: { ...(google && { google }), ...(github && { github }) },
  };
}

export type AuthSettings = NonNullable<ReturnType<typeof resolveAuthSettings>>;

export function validateAuthSecret(secret: string): void {
  if (secret.length < 32) throw new EnvError("BETTER_AUTH_SECRET must be at least 32 characters.");
}
