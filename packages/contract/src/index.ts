import type { RouterContractClient } from "@orpc/contract";
import { accountsContract } from "./accounts/procedures";
import { adminContract } from "./admin";
import { authContract } from "./auth";
import { setupContract } from "./setup";
import { systemContract } from "./system";

export const sessionContract = { accounts: accountsContract, admin: adminContract };

export const contract = {
  auth: authContract,
  setup: setupContract,
  system: systemContract,
  ...sessionContract,
};

export type ApiClient = RouterContractClient<typeof contract>;

export { requiresTrustedOrigin } from "./policies";
export { isRestProcedure } from "./rest";
