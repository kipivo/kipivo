import type { AccountProfile } from "@kipivo/account";
import type { DirectoryListInput } from "@kipivo/admin/directory";
import { getPermissions, hasPermission, type AccountRole, type Permission } from "@kipivo/rbac";
import type { SettingsAccess } from "./settings";

type Account = AccountProfile & { role: AccountRole };

export interface AccountRepository {
  find(id: string): Promise<Account | undefined>;
  list(input: DirectoryListInput): Promise<{ items: Account[]; nextCursor: string | null }>;
  /**
   * Re-read the actor and check `accounts.roles.update` in the same transaction as the update.
   * Prevent concurrent permission changes from invalidating that check before the update.
   * Return `forbidden` for a missing actor, insufficient permission, or a self-change before
   * checking target existence.
   */
  setRole(
    actorId: string,
    targetId: string,
    role: AccountRole,
  ): Promise<
    { status: "ok"; account: Account } | { status: "forbidden" } | { status: "not_found" }
  >;
}

export function createAccessService(accounts: AccountRepository) {
  async function authorize(actorId: string, permission: Permission) {
    const account = await accounts.find(actorId);
    if (!account) return { status: "unauthorized" } as const;
    if (!hasPermission(account.role, permission)) return { status: "forbidden" } as const;
    return { status: "ok", account } as const;
  }

  return {
    async getMe(actorId: string) {
      const result = await authorize(actorId, "account.read");
      if (result.status !== "ok") return result;
      const { account } = result;
      return {
        status: "ok" as const,
        value: { ...account, permissions: [...getPermissions(account.role)] },
      };
    },
    async list(actorId: string, input: DirectoryListInput) {
      const result = await authorize(actorId, "accounts.read");
      if (result.status !== "ok") return result;
      return { status: "ok", value: await accounts.list(input) } as const;
    },
    async changeRole(actorId: string, { id, role }: { id: string; role: AccountRole }) {
      const authorization = await authorize(actorId, "accounts.roles.update");
      if (authorization.status !== "ok") return authorization;
      const result = await accounts.setRole(actorId, id, role);
      if (result.status !== "ok") return result;
      return { status: "ok", value: result.account } as const;
    },
  };
}

export type AccessService = ReturnType<typeof createAccessService>;

export function createCurrentAccountQuery(
  accounts: Pick<AccessService, "getMe">,
  settings: Pick<SettingsAccess, "personal">,
) {
  return async (actorId: string) => {
    const result = await accounts.getMe(actorId);
    if (result.status !== "ok") return result;

    return {
      status: "ok",
      value: { ...result.value, settings: await settings.personal(actorId) },
    } as const;
  };
}

export type CurrentAccountQuery = ReturnType<typeof createCurrentAccountQuery>;
