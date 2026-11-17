import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { Database } from "@kipivo/db/client";
import * as schema from "@kipivo/db/schema";
import { betterAuth } from "better-auth/minimal";

export function createAuth(options: { database: Database; baseURL: string; secret: string }) {
  if (options.secret.length < 32)
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters.");
  return betterAuth({
    appName: "Kipivo",
    baseURL: options.baseURL,
    basePath: "/api/auth",
    secret: options.secret,
    trustedOrigins: [options.baseURL],
    database: drizzleAdapter(options.database, { provider: "pg", schema, transaction: true }),
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    advanced: {
      cookiePrefix: "kipivo",
      useSecureCookies: options.baseURL.startsWith("https:"),
    },
  });
}
