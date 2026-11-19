import { describe, expect, it } from "vitest";
import { accountRoles, canAssignAccountRole, getPermissions, type AccountRole } from "./index";

describe("getPermissions", () => {
  const expectedPermissions = {
    member: ["account.read"],
    admin: ["account.read", "accounts.read", "accounts.roles.update", "settings.manage"],
  } satisfies Record<AccountRole, readonly string[]>;

  it.each(accountRoles)("returns the exact permissions for %s", (role) => {
    expect(getPermissions(role)).toEqual(expectedPermissions[role]);
  });
});

describe("canAssignAccountRole", () => {
  it("allows changing another account's role with the update permission alone", () => {
    expect(
      canAssignAccountRole({ id: "actor", permissions: ["accounts.roles.update"] }, "target"),
    ).toBe(true);
  });

  it("does not allow changing another account's role with only read permissions", () => {
    expect(
      canAssignAccountRole(
        { id: "actor", permissions: ["account.read", "accounts.read"] },
        "target",
      ),
    ).toBe(false);
  });

  it("does not allow changing one's own role even with admin permissions", () => {
    expect(
      canAssignAccountRole({ id: "actor", permissions: getPermissions("admin") }, "actor"),
    ).toBe(false);
  });
});
