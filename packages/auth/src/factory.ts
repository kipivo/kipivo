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
import { validateAuthSecret } from "./env";
import { nativeLogin } from "./native/plugin";

const mailPaths = new Set([
  "/sign-in/magic-link",
  "/magic-link/verify",
  "/email-otp/send-verification-otp",
  "/sign-in/email-otp",
  "/request-password-reset",
  "/reset-password",
]);

export function createAuth(options: { database: Database; baseURL: string; secret: string }) {
  validateAuthSecret(options.secret);
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
    trustedOrigins: [options.baseURL],
    verification: {
      storeIdentifier: { default: "plain", overrides: { "reset-password:": "hashed" } },
    },
    database: drizzleAdapter(options.database, { provider: "pg", schema, transaction: true }),
    plugins: [
      nativeLogin(new URL(options.baseURL).origin),
      {
        id: "kipivo-auth-methods",
        endpoints: {
          emailMethods: createAuthEndpoint("/email-methods", { method: "GET" }, async (ctx) =>
            ctx.json({ enabled: await mail.enabled() }),
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
        if (ctx.path !== "/sign-up/email") return;
        const open = await setup.isOpen();
        if (open === undefined) throw new APIError("SERVICE_UNAVAILABLE");
        if (open)
          throw new APIError("CONFLICT", {
            message: "Complete administrator setup before registering.",
          });
      }),
    },
    advanced: {
      cookiePrefix: "kipivo",
      useSecureCookies: options.baseURL.startsWith("https:"),
    },
  });
}
