import { accountRoles, defaultAccountRole } from "@kipivo/rbac";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  unique,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const accountRole = pgEnum("account_role", accountRoles);

const date = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => date("created_at").defaultNow().notNull();
const updatedAt = () =>
  date("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull();

export const user = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: accountRole("role").default(defaultAccountRole).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const configKey = pgTable(
  "config_key",
  {
    key: text("key").primaryKey(),
    scope: text("scope", { enum: ["instance", "user"] }).notNull(),
    editor: text("editor", { enum: ["system", "admin", "owner"] }).notNull(),
    defaultValue: jsonb("default_value").$type<Record<string, unknown>>(),
  },
  (t) => [
    unique().on(t.key, t.scope),
    check(
      "config_key_policy",
      sql`(${t.scope} = 'instance' AND ${t.editor} IN ('system','admin')) OR (${t.scope} = 'user' AND ${t.editor} IN ('system','owner'))`,
    ),
    check(
      "config_key_default",
      sql`${t.defaultValue} IS NULL OR jsonb_typeof(${t.defaultValue}) = 'object'`,
    ),
  ],
);

export const configApp = pgTable(
  "config_app",
  {
    scope: text("scope").notNull().default("instance"),
    key: text("key").primaryKey(),
    value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  },
  ({ key, value, scope }) => [
    foreignKey({
      columns: [key, scope],
      foreignColumns: [configKey.key, configKey.scope],
    }),
    check("config_app_scope", sql`${scope} = 'instance'`),
    check("config_app_object", sql`jsonb_typeof(${value}) = 'object'`),
    check(
      "config_app_admin_setup_state",
      sql`${key} <> 'admin_setup' OR ${value} IN ('{"status":"pending"}'::jsonb, '{"status":"closed"}'::jsonb)`,
    ),
  ],
);

export const configUser = pgTable(
  "config_user",
  {
    scope: text("scope").notNull().default("user"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.key, t.scope],
      foreignColumns: [configKey.key, configKey.scope],
    }),
    check("config_user_scope", sql`${t.scope} = 'user'`),
    primaryKey({ columns: [t.userId, t.key] }),
    check("config_user_object", sql`jsonb_typeof(${t.value}) = 'object'`),
  ],
);

export const session = pgTable(
  "auth_session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: date("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("auth_session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "auth_account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: date("access_token_expires_at"),
    refreshTokenExpiresAt: date("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("auth_account_user_id_idx").on(table.userId),
    uniqueIndex("auth_account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  "auth_verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: date("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("auth_verification_identifier_idx").on(table.identifier)],
);
