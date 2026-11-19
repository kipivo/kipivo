import type { AccountRole, Permission } from "@kipivo/rbac";

export const roleLabel: Record<AccountRole, string> = {
  member: "Member",
  admin: "Administrator",
};

export const permissionLabel: Record<Permission, string> = {
  "account.read": "View their own account",
  "accounts.read": "View all accounts",
  "settings.manage": "Manage instance settings",
  "accounts.roles.update": "Change account roles",
};
