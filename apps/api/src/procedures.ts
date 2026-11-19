import { authProcedures } from "./auth/procedures";
import type { AuthProcedureContext } from "./auth/request";
import { contract, requiresTrustedOrigin, sessionContract } from "@kipivo/api/contract";
import { rpcLogger, type EvlogOrpcContext } from "@kipivo/logger/orpc";
import { implement } from "@orpc/server";
import { readAccountResult, readCurrentAccount, type RequestAccess } from "./access";
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
      if (requiresTrustedOrigin(procedure) && headers.get("origin") !== access.trustedOrigin) {
        throw errors.FORBIDDEN({ message: "A trusted request Origin is required." });
      }
      return next({ context: { access, actorId } });
    });
  const protectedRoutes = signedIn.router({
    accounts: {
      me: {
        get: signedIn.accounts.me.get.handler(({ context: { access, actorId }, errors }) =>
          readCurrentAccount(access, actorId, errors),
        ),
        settings: {
          get: signedIn.accounts.me.settings.get.handler(({ context: { access, actorId } }) =>
            access.settings.personal(actorId),
          ),
          update: signedIn.accounts.me.settings.update.handler(
            async ({ context: { access, actorId, log }, input }) => {
              const settings = await access.settings.savePersonal(actorId, input);
              recordProductEvent(log, "settings.personal_saved");
              return settings;
            },
          ),
        },
      },
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
        role: {
          update: signedIn.admin.accounts.role.update.handler(
            async ({ context, input, errors }) => {
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
            },
          ),
        },
      },
      settings: {
        email: {
          get: signedIn.admin.settings.email.get.handler(
            async ({ context: { access, actorId }, errors }) =>
              readAccountResult(await access.email.get(actorId), errors),
          ),
          update: signedIn.admin.settings.email.update.handler(
            async ({ context: { access, actorId, log }, input, errors }) => {
              const value = readAccountResult(await access.email.save(actorId, input), errors);
              if (!value) throw errors.BAD_REQUEST();
              recordProductEvent(log, "settings.email_saved");
              return value;
            },
          ),
        },
        directory: {
          get: signedIn.admin.settings.directory.get.handler(
            async ({ context: { access, actorId }, errors }) =>
              readAccountResult(await access.settings.directory(actorId), errors),
          ),
          update: signedIn.admin.settings.directory.update.handler(
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
      },
    },
  });
  return api.router({
    auth: authProcedures,
    system: { ping: api.system.ping.handler(() => ({ ok: true })) },
    setup: {
      get: api.setup.get.handler(async ({ context, errors }) => {
        const open = await context.access?.setup.isOpen();
        if (open === undefined) throw errors.SERVICE_UNAVAILABLE();
        return { open };
      }),
      create: api.setup.create.handler(
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
