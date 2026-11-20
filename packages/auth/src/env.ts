import { createEnv, EnvError, parseHttpOrigin, z, type Preset } from "@kipivo/env";

export const authEnv = {
  id: "auth",
  server: {
    AUTH_URL: z.string().optional(),
    AUTH_SECRET: z.string().optional(),
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
  const { AUTH_URL, AUTH_SECRET } = env;
  const google = readOAuthCredentials(env, "GOOGLE");
  const github = readOAuthCredentials(env, "GITHUB");

  if (!hasDatabase && !AUTH_URL && !AUTH_SECRET && !google && !github) return null;
  if (!hasDatabase || !AUTH_URL || !AUTH_SECRET) {
    throw new EnvError("Set DATABASE_URL, AUTH_URL, and AUTH_SECRET together.");
  }

  const baseURL = parseHttpOrigin(AUTH_URL);
  if (!baseURL) throw new EnvError("AUTH_URL must be the public Web HTTP(S) origin.");
  validateAuthSecret(AUTH_SECRET);

  return {
    baseURL,
    secret: AUTH_SECRET,
    socialProviders: { ...(google && { google }), ...(github && { github }) },
  };
}

export type AuthSettings = NonNullable<ReturnType<typeof resolveAuthSettings>>;

export function validateAuthSecret(secret: string): void {
  if (secret.length < 32) throw new EnvError("AUTH_SECRET must be at least 32 characters.");
}
