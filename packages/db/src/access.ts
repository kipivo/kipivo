import type { AccountProfile } from "@kipivo/account";
import type { DirectoryListInput } from "@kipivo/admin/directory";
import { canAssignAccountRole, getPermissions, type AccountRole } from "@kipivo/rbac";
import { and, asc, eq, gt, inArray, or, sql } from "drizzle-orm";
import type { Database } from "./factory";
import { directoryConfig } from "./config";
import { user } from "./schema";

type StoredAccount = AccountProfile & { role: AccountRole };

const accountFields = {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
};

export function createAccountRepository(db: Database) {
  return {
    async find(id: string): Promise<StoredAccount | undefined> {
      const [account] = await db.select(accountFields).from(user).where(eq(user.id, id));
      return account;
    },
    async list({ cursor, limit: requested, query }: DirectoryListInput) {
      const limit = requested ?? (await directoryConfig(db)).pageSize;
      const accounts = await db
        .select(accountFields)
        .from(user)
        .where(
          and(
            cursor ? gt(user.id, cursor) : undefined,
            query
              ? or(
                  sql`strpos(lower(${user.name}), lower(${query})) > 0`,
                  sql`strpos(lower(${user.email}), lower(${query})) > 0`,
                )
              : undefined,
          ),
        )
        .orderBy(asc(user.id))
        .limit(limit + 1);
      const items = accounts.slice(0, limit);
      return {
        items,
        nextCursor: accounts.length > limit ? (items.at(-1)?.id ?? null) : null,
      };
    },
    setRole(actorId: string, targetId: string, role: AccountRole) {
      return db.transaction(async (tx) => {
        // Lock in a consistent order so concurrent administrators cannot demote each other.
        const accounts = await tx
          .select(accountFields)
          .from(user)
          .where(inArray(user.id, [actorId, targetId]))
          .orderBy(asc(user.id))
          .for("update");
        const actor = accounts.find(({ id }) => id === actorId);
        if (
          !actor ||
          !canAssignAccountRole({ id: actor.id, permissions: getPermissions(actor.role) }, targetId)
        ) {
          return { status: "forbidden" } as const;
        }
        const target = accounts.find(({ id }) => id === targetId);
        if (!target) return { status: "not_found" } as const;
        if (target.role !== role) {
          await tx.update(user).set({ role }).where(eq(user.id, targetId));
        }
        return { status: "ok", account: { ...target, role } } as const;
      });
    },
  };
}
