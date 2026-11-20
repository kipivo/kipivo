import type { CurrentAccountQuery } from "@kipivo/core/access";
import { readSessionIdentity } from "../session";
import { readAccountResult } from "./errors";
import { api, requireService } from "./builders";

export function createAuthProcedures(currentAccount?: CurrentAccountQuery) {
  const { auth } = api;

  return auth.router({
    session: {
      get: auth.session.get.handler(async ({ context: { identity }, input, errors }) => {
        if (!identity) throw errors.SERVICE_UNAVAILABLE();
        const current = await readSessionIdentity(() => identity.readSession());
        if (!current) return null;
        const session = {
          user: current.user,
          session: { id: current.session.id, expiresAt: current.session.expiresAt.toISOString() },
        };
        if (!input?.includeAccount) return session;

        return {
          ...session,
          account: readAccountResult(
            await requireService(currentAccount, errors)(session.user.id),
            errors,
          ),
        };
      }),
    },
  });
}
