import { authProcedures } from "./auth/procedures";
import type { AuthProcedureContext } from "./auth/request";
import { contract, sessionContract } from "@kipivo/api/contract";
import { rpcLogger, type EvlogOrpcContext } from "@kipivo/logger/orpc";
import { implement } from "@orpc/server";
import { readAccountResult, type RequestAccess } from "./access";
import { recordProductEvent } from "./telemetry";

interface ProcedureContext extends EvlogOrpcContext, AuthProcedureContext {
  access?: RequestAccess;
  headers: Headers;
  requestId: string;
}

export function createProcedureRouter() {
  const api = implement(contract).$context<ProcedureContext>().use(rpcLogger());
  const signedIn = implement(sessionContract)
    .$context<ProcedureContext>()
    .use(async ({ context: { access, headers }, procedure, errors, next }) => {
      if (!access) throw errors.SERVICE_UNAVAILABLE();
      const actorId = await access.getActorId(headers);
      if (!actorId) throw errors.UNAUTHORIZED();
      if (
        procedure["~orpc"].meta.requiresTrustedOrigin &&
        headers.get("origin") !== access.trustedOrigin
      ) {
        throw errors.FORBIDDEN({ message: "A trusted request Origin is required." });
      }
      return next({ context: { access, actorId } });
    });
  const protectedRoutes = signedIn.router({
    account: {
      me: signedIn.account.me.handler(async ({ context, errors }) => {
        const {
          access: { accounts },
          actorId,
        } = context;
        const account = readAccountResult(await accounts.getMe(actorId), errors);
        return { ...account, settings: await context.access.settings.personal(actorId) };
      }),
    },
    settings: {
      personal: signedIn.settings.personal.handler(({ context: { access, actorId } }) =>
        access.settings.personal(actorId),
      ),
      savePersonal: signedIn.settings.savePersonal.handler(
        async ({ context: { access, actorId, log }, input }) => {
          const settings = await access.settings.savePersonal(actorId, input);
          recordProductEvent(log, "settings.personal_saved");
          return settings;
        },
      ),
      email: signedIn.settings.email.handler(async ({ context: { access, actorId }, errors }) =>
        readAccountResult(await access.email.get(actorId), errors),
      ),
      saveEmail: signedIn.settings.saveEmail.handler(
        async ({ context: { access, actorId, log }, input, errors }) => {
          const value = readAccountResult(await access.email.save(actorId, input), errors);
          if (!value) throw errors.BAD_REQUEST();
          recordProductEvent(log, "settings.email_saved");
          return value;
        },
      ),
      directory: signedIn.settings.directory.handler(
        async ({ context: { access, actorId }, errors }) =>
          readAccountResult(await access.settings.directory(actorId), errors),
      ),
      saveDirectory: signedIn.settings.saveDirectory.handler(
        async ({ context: { access, actorId, log }, input, errors }) => {
          const settings = readAccountResult(
            await access.settings.saveDirectory(actorId, input),
            errors,
          );
          recordProductEvent(log, "settings.directory_saved");
          return settings;
        },
      ),
    },
    admin: {
      accounts: {
        list: signedIn.admin.accounts.list.handler(async ({ context, input, errors }) => {
          const {
            access: { accounts },
            actorId,
          } = context;
          return readAccountResult(await accounts.list(actorId, input), errors);
        }),
        setRole: signedIn.admin.accounts.setRole.handler(async ({ context, input, errors }) => {
          const {
            access: { accounts },
            actorId,
          } = context;
          const result = await accounts.changeRole(actorId, input);
          if (result.status === "not_found") throw errors.NOT_FOUND();
          const account = readAccountResult(result, errors);
          context.log?.set({
            access: { actorId, targetId: input.id, role: input.role },
          });
          recordProductEvent(context.log, "account.role_set");
          return account;
        }),
      },
    },
  });
  return api.router({
    auth: authProcedures,
    system: { ping: api.system.ping.handler(() => ({ ok: true })) },
    setup: {
      status: api.setup.status.handler(async ({ context, errors }) => {
        const open = await context.access?.setup.isOpen();
        if (open === undefined) throw errors.SERVICE_UNAVAILABLE();
        return { open };
      }),
      install: api.setup.install.handler(
        async ({ context: { access, headers, log }, input, errors }) => {
          if (!access) throw errors.SERVICE_UNAVAILABLE();
          if (headers.get("origin") !== access.trustedOrigin) throw errors.FORBIDDEN();
          const result = await access.setup.install(input);
          if (result === "closed") throw errors.SETUP_CLOSED();
          if (result === "unavailable") throw errors.SERVICE_UNAVAILABLE();
          recordProductEvent(log, "install.completed");
          return { ok: true };
        },
      ),
    },
    ...protectedRoutes,
  });
}
