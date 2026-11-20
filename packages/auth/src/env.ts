import { isIP } from "node:net";
import { getDomain } from "tldts";
import { createEnv, EnvError, parseHttpOrigin, z, type Preset } from "@kipivo/env";

export const authEnv = {
  id: "auth",
  server: {
    AUTH_URL: z.string().optional(),
    AUTH_SECRET: z.string().optional(),
    AUTH_TRUSTED_ORIGINS: z.string().optional(),
    AUTH_COOKIE_DOMAIN: z.string().trim().toLowerCase().optional(),
    GOOGLE_CLIENT_ID: z.string().trim().optional(),
    GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
    GITHUB_CLIENT_ID: z.string().trim().optional(),
    GITHUB_CLIENT_SECRET: z.string().trim().optional(),
  },
} as const satisfies Preset;

export const envs = () => createEnv(authEnv);
type AuthEnv = ReturnType<typeof envs>;

// Keep the AUTH_URL syntax in sync with the gateway's alias redirect.
const authOriginPattern =
  /^[Hh][Tt][Tt][Pp][Ss]?:\/\/(?:[a-zA-Z0-9._-]+|\[[a-fA-F0-9:.]+\])(?::[0-9]+)?\/?$/;

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
  const { AUTH_URL, AUTH_SECRET, AUTH_TRUSTED_ORIGINS, AUTH_COOKIE_DOMAIN } = env;
  const google = readOAuthCredentials(env, "GOOGLE");
  const github = readOAuthCredentials(env, "GITHUB");

  if (
    !hasDatabase &&
    !AUTH_URL &&
    !AUTH_SECRET &&
    !AUTH_TRUSTED_ORIGINS &&
    !AUTH_COOKIE_DOMAIN &&
    !google &&
    !github
  )
    return null;
  if (!hasDatabase || !AUTH_URL || !AUTH_SECRET) {
    throw new EnvError("Set DATABASE_URL, AUTH_URL, and AUTH_SECRET together.");
  }

  const baseURL = parseHttpOrigin(AUTH_URL);
  if (!authOriginPattern.test(AUTH_URL) || !baseURL)
    throw new EnvError(
      "AUTH_URL must be the public Web HTTP(S) origin. Use ASCII Punycode for internationalized hostnames.",
    );
  validateAuthSecret(AUTH_SECRET);

  const origins = new Set([baseURL]);
  for (const configuredOrigin of AUTH_TRUSTED_ORIGINS?.split(",") ?? []) {
    const origin = parseHttpOrigin(configuredOrigin.trim());
    if (!origin || origin.includes("*"))
      throw new EnvError("AUTH_TRUSTED_ORIGINS must be a comma-separated list of HTTP(S) origins.");
    origins.add(origin);
  }
  const trustedOrigins = [...origins];

  const cookieDomain = AUTH_COOKIE_DOMAIN?.replace(/^\./, "");
  const primary = new URL(baseURL);
  const trustedURLs = trustedOrigins.map((origin) => new URL(origin));
  if (cookieDomain === undefined && trustedURLs.some((url) => url.hostname !== primary.hostname)) {
    throw new EnvError(
      "AUTH_TRUSTED_ORIGINS may use additional hostnames only with AUTH_COOKIE_DOMAIN. For page aliases, redirect to AUTH_URL at the gateway.",
    );
  }
  if (
    cookieDomain !== undefined &&
    (!getDomain(cookieDomain, { allowPrivateDomains: true }) ||
      isIP(cookieDomain) ||
      !z.hostname().safeParse(cookieDomain).success ||
      trustedURLs.some(
        ({ hostname }) => hostname !== cookieDomain && !hostname.endsWith(`.${cookieDomain}`),
      ))
  ) {
    throw new EnvError(
      "AUTH_COOKIE_DOMAIN must be a shared parent hostname of the trusted Web origins.",
    );
  }
  if (trustedURLs.some((url) => url.protocol !== primary.protocol)) {
    throw new EnvError("Trusted Web origins must use the same scheme as AUTH_URL.");
  }

  return {
    baseURL,
    secret: AUTH_SECRET,
    trustedOrigins,
    ...(cookieDomain ? { cookieDomain } : {}),
    socialProviders: { ...(google && { google }), ...(github && { github }) },
  };
}

export type AuthSettings = NonNullable<ReturnType<typeof resolveAuthSettings>>;

export function sessionCookiePrefix(cookieDomain?: string) {
  // A shared cookie must have a different name from existing host-only cookies.
  return cookieDomain ? "kipivo.shared" : "kipivo";
}

export function validateAuthSecret(secret: string): void {
  if (secret.length < 32) throw new EnvError("AUTH_SECRET must be at least 32 characters.");
}
