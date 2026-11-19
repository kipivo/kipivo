import { createHash, randomBytes } from "node:crypto";
import { createAuthEndpoint, sensitiveSessionMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { nativeAuthorization, nativeClients, nativeExchange } from "./contract";

const hash = (value: string) => createHash("sha256").update(value).digest("base64url");
// Bind the lookup itself to the proof. A wrong verifier/client cannot burn a valid code.
const identifier = (client: string, code: string, challenge: string) =>
  `native-login:${client}:${hash(code)}:${challenge}`;

export function nativeLogin(webOrigin: string) {
  return {
    id: "kipivo-native-login",
    endpoints: {
      authorizeNative: createAuthEndpoint(
        "/native/authorize",
        {
          method: "POST",
          use: [sensitiveSessionMiddleware],
          body: nativeAuthorization.extend({ account_id: z.string() }),
        },
        async (ctx) => {
          if (ctx.headers?.get("origin") !== webOrigin) throw ctx.error("FORBIDDEN");
          const { user } = ctx.context.session;
          const { client_id, code_challenge, state, account_id } = ctx.body;
          if (account_id !== user.id) throw ctx.error("CONFLICT", { message: "Account changed." });
          const code = randomBytes(32).toString("base64url");
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: identifier(client_id, code, code_challenge),
            value: user.id,
            expiresAt: new Date(Date.now() + 60_000),
          });
          const callback = new URL(nativeClients[client_id].callback);
          callback.search = new URLSearchParams({ code, state }).toString();
          ctx.setHeader("Cache-Control", "no-store");
          return ctx.json({ callback: callback.href });
        },
      ),
      exchangeNative: createAuthEndpoint(
        "/native/exchange",
        {
          method: "POST",
          body: nativeExchange,
        },
        async (ctx) => {
          // Only the native HTTP client should receive this new cookie, never a browser navigation.
          if (ctx.headers?.has("origin") || ctx.headers?.has("sec-fetch-site"))
            throw ctx.error("FORBIDDEN");
          const { client_id, code, code_verifier } = ctx.body;
          const adapter = ctx.context.internalAdapter;
          const grant = await adapter.consumeVerificationValue(
            identifier(client_id, code, hash(code_verifier)),
          );
          const user = grant && (await adapter.findUserById(grant.value));
          if (!user)
            throw ctx.error("BAD_REQUEST", { message: "Invalid or expired authorization code." });
          const session = await adapter.createSession(user.id);
          await setSessionCookie(ctx, { user, session });
          ctx.setHeader("Cache-Control", "no-store");
          return ctx.json({ success: true });
        },
      ),
    },
  };
}
