import { rpcLogger } from "@kipivo/logger/orpc";
import type { ProcedureServices } from "../services";
import { createAccountProcedures } from "./accounts";
import { createAdminProcedures } from "./admin";
import { createAuthProcedures } from "./auth";
import { api } from "./builders";
import { createSetupProcedures } from "./setup";

export function createProcedureRouter(services?: ProcedureServices) {
  return api.use(rpcLogger()).router({
    auth: createAuthProcedures(services?.currentAccount),
    system: { ping: api.system.ping.handler(() => ({ ok: true })) },
    setup: createSetupProcedures(services?.setup),
    accounts: createAccountProcedures(services?.currentAccount, services?.settings),
    admin: createAdminProcedures(services?.accounts, services?.settings, services?.email),
  });
}
