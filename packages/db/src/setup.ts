import { randomUUID } from "node:crypto";
import type { Database } from "./factory";
import { setupConfig } from "./config";
import { account, user } from "./schema";

export function createSetupRepository(db: Database) {
  return {
    async isOpen() {
      const state = await setupConfig(db).read();
      return state && state.status === "pending";
    },
    async initialize() {
      await db.transaction(async (tx) => {
        const config = setupConfig(tx);
        const state = await config.read(true);
        if (!state) throw new Error("Account setup state is missing.");
        if (
          state.status === "pending" &&
          (await tx.select({ id: user.id }).from(user).limit(1)).length
        )
          await config.set({ status: "closed" });
      });
    },
    install(input: { name: string; email: string }, hashPassword: () => Promise<string>) {
      return db.transaction(async (tx) => {
        const config = setupConfig(tx);
        const state = await config.read(true);
        if (!state) return "unavailable" as const;
        if (state.status === "closed") return "closed" as const;
        if ((await tx.select({ id: user.id }).from(user).limit(1)).length) {
          await config.set({ status: "closed" });
          return "closed" as const;
        }
        const password = await hashPassword();
        const id = randomUUID();
        await tx
          .insert(user)
          .values({ id, email: input.email.toLowerCase(), name: input.name, role: "admin" });
        await tx.insert(account).values({
          id: randomUUID(),
          userId: id,
          providerId: "credential",
          accountId: id,
          password,
        });
        await config.set({ status: "closed" });
        return "ok" as const;
      });
    },
  };
}
