import { describe, expect, it, vi } from "vitest";
import { createAccessService, type AccountRepository } from "./access";

const member = {
  id: "member",
  name: "Member",
  email: "member@example.com",
  role: "member",
} as const;
const admin = { id: "admin", name: "Admin", email: "admin@example.com", role: "admin" } as const;

function setup() {
  const accounts = {
    find: vi.fn<AccountRepository["find"]>().mockResolvedValue(undefined),
    list: vi.fn<AccountRepository["list"]>(),
    setRole: vi.fn<AccountRepository["setRole"]>(),
  };
  return { accounts, access: createAccessService(accounts) };
}

describe("createAccessService", () => {
  it.each([
    { account: member, permissions: ["account.read"] },
    {
      account: admin,
      permissions: ["account.read", "accounts.read", "accounts.roles.update", "settings.manage"],
    },
  ])(
    "returns the current account with permissions for $account.role",
    async ({ account, permissions }) => {
      const { accounts, access } = setup();
      accounts.find.mockResolvedValue(account);

      await expect(access.getMe(account.id)).resolves.toEqual({
        status: "ok",
        value: { ...account, permissions },
      });
      expect(accounts.find).toHaveBeenCalledExactlyOnceWith(account.id);
    },
  );

  it("returns unauthorized for a missing actor without listing or changing accounts", async () => {
    const { accounts, access } = setup();

    await expect(access.getMe("missing")).resolves.toEqual({ status: "unauthorized" });
    await expect(access.list("missing", { limit: 1 })).resolves.toEqual({ status: "unauthorized" });
    await expect(access.changeRole("missing", { id: member.id, role: "admin" })).resolves.toEqual({
      status: "unauthorized",
    });
    expect(accounts.list).not.toHaveBeenCalled();
    expect(accounts.setRole).not.toHaveBeenCalled();
  });

  it("forbids a member from listing accounts or changing roles", async () => {
    const { accounts, access } = setup();
    accounts.find.mockResolvedValue(member);

    await expect(access.list(member.id, { limit: 1 })).resolves.toEqual({ status: "forbidden" });
    await expect(access.changeRole(member.id, { id: admin.id, role: "member" })).resolves.toEqual({
      status: "forbidden",
    });
    expect(accounts.list).not.toHaveBeenCalled();
    expect(accounts.setRole).not.toHaveBeenCalled();
  });

  it("returns the repository's page for an authorized list request", async () => {
    const { accounts, access } = setup();
    const input = { cursor: admin.id, limit: 1 };
    const page = { items: [member], nextCursor: member.id };
    accounts.find.mockResolvedValue(admin);
    accounts.list.mockResolvedValue(page);

    await expect(access.list(admin.id, input)).resolves.toEqual({ status: "ok", value: page });
    expect(accounts.list).toHaveBeenCalledExactlyOnceWith(input);
  });

  it("returns the updated account for an authorized role change", async () => {
    const { accounts, access } = setup();
    const updatedAccount = { ...member, role: "admin" } as const;
    accounts.find.mockResolvedValue(admin);
    accounts.setRole.mockResolvedValue({ status: "ok", account: updatedAccount });

    await expect(access.changeRole(admin.id, { id: member.id, role: "admin" })).resolves.toEqual({
      status: "ok",
      value: updatedAccount,
    });
    expect(accounts.setRole).toHaveBeenCalledExactlyOnceWith(admin.id, member.id, "admin");
  });

  it("returns forbidden if the repository rejects the actor after the initial authorization", async () => {
    const { accounts, access } = setup();
    accounts.find.mockResolvedValue(admin);
    accounts.setRole.mockResolvedValue({ status: "forbidden" });

    await expect(access.changeRole(admin.id, { id: member.id, role: "admin" })).resolves.toEqual({
      status: "forbidden",
    });
    expect(accounts.setRole).toHaveBeenCalledExactlyOnceWith(admin.id, member.id, "admin");
  });

  it("returns not_found if an authorized role change targets a missing account", async () => {
    const { accounts, access } = setup();
    accounts.find.mockResolvedValue(admin);
    accounts.setRole.mockResolvedValue({ status: "not_found" });

    await expect(access.changeRole(admin.id, { id: "missing", role: "admin" })).resolves.toEqual({
      status: "not_found",
    });
    expect(accounts.setRole).toHaveBeenCalledExactlyOnceWith(admin.id, "missing", "admin");
  });
});
