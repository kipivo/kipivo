import type { RequestIdentity } from "@kipivo/auth/session";
import { contract, requiresTrustedOrigin, sessionContract } from "@kipivo/contract";
import type { EvlogOrpcContext } from "@kipivo/logger/orpc";
import { implement } from "@orpc/server";
import { readSessionIdentity } from "../session";

export interface ProcedureContext extends EvlogOrpcContext {
  identity?: RequestIdentity;
  trustedOrigin: boolean;
  requestId: string;
}

export const api = implement(contract).$context<ProcedureContext>();

export function createSignedIn<T>(service: T | undefined) {
  return implement(sessionContract)
    .$context<ProcedureContext>()
    .use(async ({ context: { identity, trustedOrigin }, procedure, errors, next }) => {
      if (!service || !identity) throw errors.SERVICE_UNAVAILABLE();
      const actorId = await readSessionIdentity(() => identity.getActorId());
      if (!actorId) throw errors.UNAUTHORIZED();
      if (requiresTrustedOrigin(procedure) && !trustedOrigin) {
        throw errors.FORBIDDEN({ message: "A trusted request Origin is required." });
      }
      return next({ context: { actorId, service } });
    });
}

export function requireService<T>(
  service: T | undefined,
  errors: { SERVICE_UNAVAILABLE(): Error },
): T {
  if (!service) throw errors.SERVICE_UNAVAILABLE();
  return service;
}
