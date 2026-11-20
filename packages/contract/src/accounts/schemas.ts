import { accountProfile } from "@kipivo/account";
import { accountRoles, permissions } from "@kipivo/rbac";
import { personalSettings } from "@kipivo/account/settings";
import { z } from "zod";

export const accountRole = z.enum(accountRoles);
export const account = accountProfile.extend({ role: accountRole });
export const currentAccount = account.extend({
  settings: personalSettings,
  permissions: z.array(z.enum(permissions)),
});
