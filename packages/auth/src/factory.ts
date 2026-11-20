import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { Database } from "@kipivo/db/factory";
import * as schema from "@kipivo/db/schema";
import { createSetupRepository } from "@kipivo/db/setup";
import { APIError, createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { magicLink } from "better-auth/plugins/magic-link";
import { emailOTP } from "better-auth/plugins/email-otp";
import { createEmailSender } from "@kipivo/email/factory";
import { createEmailRepository } from "@kipivo/db/email";
import { sessionCookiePrefix, validateAuthSecret, type AuthSettings } from "./env";
import { installationRequired } from "./errors";
import { nativeLogin } from "./native/plugin";

const mailPaths = new Set([
  "/sign-in/magic-link",
  "/magic-link/verify",
  "/email-otp/send-verification-otp",
  "/sign-in/email-otp",
  "/request-password-reset",
  "/reset-password",
]);

export function createAuth(
  options: Omit<AuthSettings, "socialProviders" | "trustedOrigins"> & {
    database: Database;
    socialProviders?: AuthSettings["socialProviders"];
    trustedOrigins?: AuthSettings["trustedOrigins"];
  },
) {
  validateAuthSecret(options.secret);
  const trustedOrigins = options.trustedOrigins ?? [new URL(options.baseURL).origin];
  const setup = createSetupRepository(options.database);
  const mail = createEmailRepository(options.database, options.secret);
  const send = createEmailSender(mail.delivery);
  // Do not tie response timing or success to whether a particular mailbox exists.
  const deliver = (to: string, subject: string, text: string) => {
    void send({ to, subject, text }).catch(() =>
      console.error("Authentication email delivery failed."),
    );
    return Promise.resolve();
  };
  return betterAuth({
    appName: "Kipivo",
    baseURL: options.baseURL,
    basePath: "/api/auth",
    secret: options.secret,
    trustedOrigins,
    socialProviders: options.socialProviders,
    account: {
      encryptOAuthTokens: true,
      accountLinking: { requireLocalEmailVerified: true },
    },
    onAPIError: { errorURL: new URL("/sign-in", options.baseURL).href },
    verification: {
      storeIdentifier: { default: "plain", overrides: { "reset-password:": "hashed" } },
    },
    database: drizzleAdapter(options.database, { provider: "pg", schema, transaction: true }),
    plugins: [
      nativeLogin(trustedOrigins),
      {
        id: "kipivo-auth-methods",
        endpoints: {
          emailMethods: createAuthEndpoint("/email-methods", { method: "GET" }, async (ctx) =>
            ctx.json({ enabled: await mail.enabled() }),
          ),
          socialMethods: createAuthEndpoint("/social-methods", { method: "GET" }, async (ctx) =>
            ctx.json({ providers: Object.keys(options.socialProviders ?? {}) }),
          ),
        },
      },

      magicLink({
        disableSignUp: true,
        storeToken: "hashed",
        sendMagicLink: ({ email, url }) =>
          deliver(
            email,
            "Sign in to Kipivo",
            `Open this link to sign in within 5 minutes:\n${url}\nIf you didn't request it, ignore this email.`,
          ),
      }),
      emailOTP({
        disableSignUp: true,
        storeOTP: "hashed",
        allowedAttempts: 3,
        sendVerificationOTP: ({ email, otp }) =>
          deliver(
            email,
            "Your Kipivo sign-in code",
            `Your sign-in code is ${otp}. It expires in 5 minutes. Do not share it.`,
          ),
      }),
    ],
    disabledPaths: [
      "/email-otp/check-verification-otp",
      "/email-otp/verify-email",
      "/email-otp/request-password-reset",
      "/forget-password/email-otp",
      "/email-otp/reset-password",
      "/email-otp/request-email-change",
      "/email-otp/change-email",
    ],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, token }) =>
        deliver(
          user.email,
          "Reset your Kipivo password",
          `Choose a new password using this link:\n${options.baseURL}/reset-password#${encodeURIComponent(token)}\nIf you didn't request this, ignore this email.`,
        ),
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path && mailPaths.has(ctx.path) && !(await mail.enabled()))
          throw new APIError("SERVICE_UNAVAILABLE", { message: "Email delivery is disabled." });
        if (ctx.path === "/email-otp/send-verification-otp" && ctx.body?.type !== "sign-in")
          throw new APIError("BAD_REQUEST");
        if (
          ctx.path !== "/sign-up/email" &&
          ctx.path !== "/sign-in/social" &&
          ctx.path !== "/callback/:id"
        )
          return;
        const open = await setup.isOpen();
        if (open === undefined) throw new APIError("SERVICE_UNAVAILABLE");
        if (open)
          throw new APIError("CONFLICT", {
            code: installationRequired,
            message: "Complete administrator setup before registering.",
          });
      }),
    },
    advanced: {
      cookiePrefix: sessionCookiePrefix(options.cookieDomain),
      ...(options.cookieDomain
        ? { crossSubDomainCookies: { enabled: true, domain: options.cookieDomain } }
        : {}),
      useSecureCookies: options.baseURL.startsWith("https:"),
    },
  });
}
