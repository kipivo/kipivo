import { originRequired, sessionRequired } from "./security";
import { currentAccount } from "./account";
import { accountId, accountProfile } from "@kipivo/account";
import { nativeAuthorization, nativeExchange } from "@kipivo/auth/native";
import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

const auth = oc.errors({
  BAD_REQUEST: {},
  UNAUTHORIZED: {},
  FORBIDDEN: {},
  NOT_FOUND: {},
  CONFLICT: {},
  UNPROCESSABLE_CONTENT: {},
  TOO_MANY_REQUESTS: {},
  SERVICE_UNAVAILABLE: {},
});
const write = (
  path: `/auth/${string}`,
  summary: string,
  method: "POST" | "PUT" | "DELETE" = "POST",
) => auth.meta(openapi({ method, path, summary, spec: originRequired }));
const ok = z.object({ ok: z.literal(true) });
const email = z.email().max(254);
const password = z.string().min(1).max(128);
const credentials = z.strictObject({ email, password });
const socialProvider = z.enum(["google", "github"]);

export const authContract = {
  session: {
    get: auth
      .meta(
        openapi({
          method: "GET",
          path: "/auth/session",
          summary: "Read the current session without exposing its token",
        }),
      )
      .input(z.object({ includeAccount: z.boolean().optional() }).optional())
      .output(
        z
          .object({
            user: accountProfile,
            session: z.object({ id: z.string(), expiresAt: z.string() }),
            account: currentAccount.optional(),
          })
          .nullable(),
      ),
    create: write("/auth/session", "Sign in with a password").input(credentials).output(ok),
    delete: write("/auth/session", "Sign out and clear the session cookie", "DELETE")
      .input(z.strictObject({}).optional())
      .output(ok),
  },
  registrations: {
    create: write("/auth/registrations", "Create an account with a password")
      .input(
        credentials.extend({ name: z.string().trim().min(1).max(128), password: password.min(12) }),
      )
      .output(ok),
  },
  providers: {
    list: auth
      .meta(
        openapi({
          method: "GET",
          path: "/auth/providers",
          summary: "List configured social sign-in providers",
        }),
      )
      .output(z.object({ providers: z.array(socialProvider) })),
  },
  social: {
    authorizations: {
      create: write("/auth/social/authorizations", "Start Google or GitHub sign-in")
        .input(
          z.strictObject({
            provider: socialProvider,
            callbackURL: z.string().min(1),
            errorCallbackURL: z.string().min(1),
          }),
        )
        .output(z.object({ url: z.url({ protocol: /^https$/ }) })),
    },
  },
  methods: {
    email: {
      get: auth
        .meta(
          openapi({
            method: "GET",
            path: "/auth/methods/email",
            summary: "Check whether email sign-in methods are available",
          }),
        )
        .output(z.object({ enabled: z.boolean() })),
    },
  },
  magicLinks: {
    create: write("/auth/magic-links", "Request a sign-in link")
      .input(
        z.strictObject({
          email,
          callbackURL: z.string().optional(),
          errorCallbackURL: z.string().optional(),
        }),
      )
      .output(ok),
  },
  emailCodes: {
    create: write("/auth/email-codes", "Request a sign-in code")
      .input(z.strictObject({ email, type: z.literal("sign-in") }))
      .output(ok),
  },
  emailCodeVerifications: {
    create: write("/auth/email-code-verifications", "Sign in with an email code")
      .input(z.strictObject({ email, otp: z.string().regex(/^\d{6}$/) }))
      .output(ok),
  },
  passwordResets: {
    create: write("/auth/password-resets", "Request a password reset email")
      .input(z.strictObject({ email }))
      .output(ok),
  },
  password: {
    update: write("/auth/password", "Reset a password with an emailed token", "PUT")
      .input(z.strictObject({ token: z.string().min(1), newPassword: password.min(12) }))
      .output(ok),
  },
  native: {
    authorizations: {
      create: write(
        "/auth/native/authorizations",
        "Authorize a registered app with a browser session",
      )
        .meta(openapi.spec(sessionRequired))
        .input(nativeAuthorization.extend({ account_id: accountId }))
        .output(z.object({ callback: z.string() })),
    },
    sessions: {
      create: auth
        .meta(
          openapi({
            method: "POST",
            path: "/auth/native/sessions",
            summary: "Exchange a native authorization code and verifier for a session cookie",
          }),
        )
        .input(nativeExchange)
        .output(z.object({ success: z.literal(true) })),
    },
  },
};
