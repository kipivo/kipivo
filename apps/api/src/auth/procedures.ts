import { contract } from "@kipivo/api/contract";
import { implement } from "@orpc/server";
import { readCurrentAccount, type RequestAccess } from "../access";
import type { AuthEndpoint, AuthProcedureContext } from "./request";

const auth = implement(contract.auth).$context<AuthProcedureContext & { access?: RequestAccess }>();
type Call = { context: AuthProcedureContext; input: unknown };

const json =
  (method: AuthEndpoint["method"], path: AuthEndpoint["path"]) =>
  async ({ context, input }: Call) =>
    (await context.callAuth({ method, path }, input)).json();

const command =
  (path: AuthEndpoint["path"], method: AuthEndpoint["method"] = "POST") =>
  async ({ context, input }: Call) => {
    // Forward only the HttpOnly cookies from authentication commands.
    await context.callAuth({ method, path }, input);
    return { ok: true as const };
  };

const readSession = json("GET", "/auth/get-session");

export const authProcedures = auth.router({
  session: {
    get: auth.session.get.handler(async (call) => {
      const session = await readSession(call);
      if (!session || !call.input?.includeAccount) return session;

      const { access } = call.context;
      if (!access) throw call.errors.SERVICE_UNAVAILABLE();
      return {
        ...session,
        account: await readCurrentAccount(access, session.user.id, call.errors),
      };
    }),
    create: auth.session.create.handler(command("/auth/sign-in/email")),
    delete: auth.session.delete.handler(command("/auth/sign-out", "DELETE")),
  },
  registrations: {
    create: auth.registrations.create.handler(command("/auth/sign-up/email")),
  },
  providers: {
    list: auth.providers.list.handler(json("GET", "/auth/social-methods")),
  },
  social: {
    authorizations: {
      create: auth.social.authorizations.create.handler(async ({ context, input }) => {
        const response = await context.callAuth(
          { method: "POST", path: "/auth/sign-in/social" },
          { ...input, disableRedirect: true },
        );
        const { url } = await response.json();
        return { url };
      }),
    },
  },
  methods: {
    email: {
      get: auth.methods.email.get.handler(json("GET", "/auth/email-methods")),
    },
  },
  magicLinks: { create: auth.magicLinks.create.handler(command("/auth/sign-in/magic-link")) },
  emailCodes: {
    create: auth.emailCodes.create.handler(command("/auth/email-otp/send-verification-otp")),
  },
  emailCodeVerifications: {
    create: auth.emailCodeVerifications.create.handler(command("/auth/sign-in/email-otp")),
  },
  passwordResets: {
    create: auth.passwordResets.create.handler(command("/auth/request-password-reset")),
  },
  password: { update: auth.password.update.handler(command("/auth/reset-password", "PUT")) },
  native: {
    authorizations: {
      create: auth.native.authorizations.create.handler(json("POST", "/auth/native/authorize")),
    },
    sessions: {
      create: auth.native.sessions.create.handler(json("POST", "/auth/native/exchange")),
    },
  },
});
