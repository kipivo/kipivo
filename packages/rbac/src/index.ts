export const accountRoles = ["member", "admin"] as const;
export type AccountRole = (typeof accountRoles)[number];
export const defaultAccountRole = "member" satisfies AccountRole;

export const permissions = [
  "account.read",
  "accounts.read",
  "accounts.roles.update",
  "settings.manage",
] as const;
export type Permission = (typeof permissions)[number];

const rolePermissions: Record<AccountRole, readonly Permission[]> = {
  member: ["account.read"],
  admin: permissions,
};

export function getPermissions(role: AccountRole): readonly Permission[] {
  return rolePermissions[role];
}

export function hasPermission(role: AccountRole, permission: Permission): boolean {
  return getPermissions(role).includes(permission);
}

export function canAssignAccountRole(
  actor: { id: string; permissions: readonly Permission[] },
  targetId: string,
): boolean {
  return actor.id !== targetId && actor.permissions.includes("accounts.roles.update");
}
