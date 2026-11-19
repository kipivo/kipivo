import { originHeader, sessionRequired } from "./security";
import { accountId, accountProfile } from "@kipivo/account";
import { nativeAuthorization, nativeExchange } from "@kipivo/auth/native";
import { oc, type Route } from "@orpc/contract";
import { z } from "zod";

const auth = oc.errors({
  BAD_REQUEST: {},
  UNAUTHORIZED: {},
  FORBIDDEN: {},
  NOT_FOUND: {},
  CONFLICT: {},
  UNPROCESSABLE_CONTENT: { status: 422 },
  TOO_MANY_REQUESTS: {},
  SERVICE_UNAVAILABLE: {},
});
const webWrite: NonNullable<Route["spec"]> = (operation) => ({
  ...operation,
  parameters: [...(operation.parameters ?? []), originHeader],
});
const post = (path: `/auth/${string}`, summary: string) =>
  auth.route({ method: "POST", path, summary, spec: webWrite });
const ok = z.object({ ok: z.literal(true) });
const email = z.email().max(254);
const password = z.string().min(1).max(128);
const credentials = z.strictObject({ email, password });
const socialProvider = z.enum(["google", "github"]);

export const authContract = {
  signUp: post("/auth/sign-up/email", "Create an account with a password")
    .input(
      credentials.extend({ name: z.string().trim().min(1).max(128), password: password.min(12) }),
    )
    .output(ok),
  signIn: post("/auth/sign-in/email", "Sign in with a password").input(credentials).output(ok),
  signInSocial: post("/auth/sign-in/social", "Start Google or GitHub sign-in")
    .input(
      z.strictObject({
        provider: socialProvider,
        callbackURL: z.string().min(1),
        errorCallbackURL: z.string().min(1),
      }),
    )
    .output(z.object({ url: z.url({ protocol: /^https$/ }) })),
  signOut: post("/auth/sign-out", "Sign out and clear the session cookie")
    .input(z.strictObject({}))
    .output(ok),
  getSession: auth
    .route({
      method: "GET",
      path: "/auth/get-session",
      summary: "Read the current session without exposing its token",
    })
    .output(
      z
        .object({
          user: accountProfile,
          session: z.object({ id: z.string(), expiresAt: z.string() }),
        })
        .nullable(),
    ),
  emailMethods: auth
    .route({
      method: "GET",
      path: "/auth/email-methods",
      summary: "Check whether email sign-in methods are available",
    })
    .output(z.object({ enabled: z.boolean() })),
  socialMethods: auth
    .route({
      method: "GET",
      path: "/auth/social-methods",
      summary: "List configured social sign-in providers",
    })
    .output(z.object({ providers: z.array(socialProvider) })),
  sendMagicLink: post("/auth/sign-in/magic-link", "Request a sign-in link")
    .input(
      z.strictObject({
        email,
        callbackURL: z.string().optional(),
        errorCallbackURL: z.string().optional(),
      }),
    )
    .output(ok),
  sendEmailCode: post("/auth/email-otp/send-verification-otp", "Request a sign-in code")
    .input(z.strictObject({ email, type: z.literal("sign-in") }))
    .output(ok),
  signInWithCode: post("/auth/sign-in/email-otp", "Sign in with an email code")
    .input(z.strictObject({ email, otp: z.string().regex(/^\d{6}$/) }))
    .output(ok),
  requestPasswordReset: post("/auth/request-password-reset", "Request a password reset email")
    .input(z.strictObject({ email }))
    .output(ok),
  resetPassword: post("/auth/reset-password", "Reset a password with an emailed token")
    .input(z.strictObject({ token: z.string().min(1), newPassword: password.min(12) }))
    .output(ok),
  native: {
    authorize: post("/auth/native/authorize", "Authorize a registered app with a browser session")
      .route({ spec: (op) => webWrite(sessionRequired(op)) })
      .input(nativeAuthorization.extend({ account_id: accountId }))
      .output(z.object({ callback: z.string() })),
    exchange: auth
      .route({
        method: "POST",
        path: "/auth/native/exchange",
        summary: "Exchange a native authorization code and verifier for a session cookie",
      })
      .input(nativeExchange)
      .output(z.object({ success: z.literal(true) })),
  },
};
