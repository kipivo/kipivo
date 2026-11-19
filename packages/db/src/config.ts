import { personalSettings, type PersonalSettings } from "@kipivo/account/settings";
import { directorySettings, type DirectorySettings } from "@kipivo/admin/directory";
import { createEmailConfig, storedEmailSettings, redactEmailSettings } from "@kipivo/email/config";
import type { EmailSettingsInput } from "@kipivo/email/settings";
import { hasPermission } from "@kipivo/rbac";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "./factory";
import { configApp, configKey, user, configUser } from "./schema";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Connection = Database | Tx;
const setupSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("pending") }),
  z.strictObject({ status: z.literal("closed") }),
]);
// The database catalog supplies policy and defaults. Only known shapes have application accessors.
const presets = {
  setup: { key: "admin_setup", scope: "instance", editor: "system", schema: setupSchema },
  directory: {
    key: "account_directory",
    scope: "instance",
    editor: "admin",
    schema: directorySettings,
  },
  email: {
    key: "email_delivery",
    scope: "instance",
    editor: "admin",
    schema: storedEmailSettings,
  },
  display: { key: "account_display", scope: "user", editor: "owner", schema: personalSettings },
} as const;
type Preset = (typeof presets)[keyof typeof presets];
function policy(preset: Preset) {
  return and(
    eq(configKey.key, preset.key),
    eq(configKey.scope, preset.scope),
    eq(configKey.editor, preset.editor),
  );
}
async function editableKey(tx: Tx, preset: Exclude<Preset, { editor: "system" }>) {
  const [allowed] = await tx
    .select({ key: configKey.key })
    .from(configKey)
    .where(policy(preset))
    .for("share");
  if (!allowed) throw new Error("Settings definition is unavailable.");
  return allowed.key;
}

export function setupConfig(conn: Connection) {
  const condition = eq(configApp.key, presets.setup.key);
  return {
    async read(lock = false) {
      const query = conn
        .select({ value: configApp.value })
        .from(configApp)
        .innerJoin(configKey, eq(configKey.key, configApp.key))
        .where(policy(presets.setup));
      const [row] = await (lock ? query.for("update", { of: configApp }) : query);
      return row && presets.setup.schema.parse(row.value);
    },
    async set(value: z.infer<typeof setupSchema>) {
      await conn
        .update(configApp)
        .set({ value: presets.setup.schema.parse(value) })
        .where(condition);
    },
  };
}

export async function directoryConfig(conn: Connection) {
  const [row] = await conn
    .select({ stored: configApp.value, fallback: configKey.defaultValue })
    .from(configKey)
    .leftJoin(configApp, eq(configApp.key, configKey.key))
    .where(policy(presets.directory));
  return presets.directory.schema.parse(row?.stored ?? row?.fallback);
}

async function asManager<T>(
  db: Database,
  id: string,
  action: (tx: Tx) => Promise<T>,
): Promise<{ status: "ok"; value: T } | { status: "forbidden" }> {
  return db.transaction(async (tx) => {
    const [actor] = await tx
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, id))
      .for("share");
    if (!actor || !hasPermission(actor.role, "settings.manage"))
      return { status: "forbidden" } as const;
    return { status: "ok", value: await action(tx) } as const;
  });
}

export function createSettingsRepository(db: Database) {
  return {
    async personal(id: string) {
      const [row] = await db
        .select({ stored: configUser.value, fallback: configKey.defaultValue })
        .from(configKey)
        .leftJoin(configUser, and(eq(configUser.key, configKey.key), eq(configUser.userId, id)))
        .where(policy(presets.display));
      return presets.display.schema.parse(row?.stored ?? row?.fallback);
    },
    async savePersonal(id: string, settings: PersonalSettings) {
      const value = presets.display.schema.parse(settings);
      return db.transaction(async (tx) => {
        const key = await editableKey(tx, presets.display);
        await tx
          .insert(configUser)
          .values({ userId: id, key, value })
          .onConflictDoUpdate({
            target: [configUser.userId, configUser.key],
            set: { value },
          });
        return value;
      });
    },
    directory: (id: string) => asManager(db, id, directoryConfig),
    saveDirectory: (id: string, settings: DirectorySettings) =>
      asManager(db, id, async (tx) => {
        const key = await editableKey(tx, presets.directory);
        const value = presets.directory.schema.parse(settings);
        await tx
          .insert(configApp)
          .values({ key, value })
          .onConflictDoUpdate({ target: configApp.key, set: { value } });
        return value;
      }),
  };
}

export function createEmailRepository(db: Database, secret: string) {
  const config = createEmailConfig(secret);
  const preset = presets.email;
  async function read(conn: Connection) {
    const [row] = await conn
      .select({ stored: configApp.value, fallback: configKey.defaultValue })
      .from(configKey)
      .leftJoin(configApp, eq(configApp.key, configKey.key))
      .where(policy(preset));
    return preset.schema.parse(row?.stored ?? row?.fallback);
  }
  return {
    async enabled() {
      return (await read(db)).enabled;
    },
    async delivery() {
      return config.delivery(await read(db));
    },
    get: (id: string) => asManager(db, id, async (tx) => redactEmailSettings(await read(tx))),
    save: (id: string, input: EmailSettingsInput) =>
      asManager(db, id, async (tx) => {
        // Serialize even the first save: a missing value row cannot itself be locked.
        const [allowed] = await tx
          .select({ key: configKey.key })
          .from(configKey)
          .where(policy(preset))
          .for("update");
        if (!allowed) throw new Error("Email settings definition is unavailable.");
        const value = config.update(await read(tx), input);
        if (!value) return null;
        await tx
          .insert(configApp)
          .values({ key: allowed.key, value })
          .onConflictDoUpdate({ target: configApp.key, set: { value } });
        return redactEmailSettings(value);
      }),
  };
}
