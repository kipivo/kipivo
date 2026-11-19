import { isNotNull } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { createSettingsRepository } from "./config";
import { user, session, account, verification, configUser } from "./schema";
import { createAccountRepository } from "./access";
import { createSetupRepository } from "./setup";

export function createDatabase(connectionString: string) {
  const sql = postgres(connectionString, {
    max: 10,
    connect_timeout: 2.5,
    queue_timeout: 2.5,
    idle_timeout: 30,
    query_timeout: 5,
  });
  const db = drizzle(sql);
  const setup = createSetupRepository(db);
  let closing: Promise<void> | undefined;

  return {
    db,
    repositories: {
      accounts: createAccountRepository(db),
      setup,
      settings: createSettingsRepository(db),
    },
    async ready() {
      if (closing) return false;
      // LIMIT 0 checks required relations/columns without scanning account data.
      const [open] = await Promise.all([
        setup.isOpen(),
        db
          .select({ id: user.id })
          .from(user)
          .where(isNotNull(user.role))
          .unionAll(db.select({ id: session.id }).from(session))
          .unionAll(db.select({ id: account.id }).from(account))
          .unionAll(db.select({ id: verification.id }).from(verification))
          .unionAll(db.select({ id: configUser.userId }).from(configUser))
          .limit(0),
      ]);
      return open !== undefined;
    },
    close() {
      return (closing ??= sql.end());
    },
  };
}

export type Database = PostgresJsDatabase & { $client: Sql };

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
