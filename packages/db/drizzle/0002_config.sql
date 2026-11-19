-- Do not initialize setup a second time over an unreleased migration draft.
DO $$ BEGIN
  IF to_regclass('account_setup') IS NOT NULL OR to_regclass('app_config') IS NOT NULL
     OR to_regclass('config_instance_value') IS NOT NULL THEN
    RAISE EXCEPTION 'Unreleased configuration tables exist; reconcile the database before applying 0002_config.';
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "config_app" (
	"scope" text DEFAULT 'instance' NOT NULL,
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	CONSTRAINT "config_app_scope" CHECK ("config_app"."scope" = 'instance'),
	CONSTRAINT "config_app_object" CHECK (jsonb_typeof("config_app"."value") = 'object'),
	CONSTRAINT "config_app_admin_setup_state" CHECK ("config_app"."key" <> 'admin_setup' OR (
      "config_app"."value" IN ('{"status":"pending"}'::jsonb, '{"status":"closed"}'::jsonb) OR (
        "config_app"."value" - 'tokenDigest' = '{"status":"issued"}'::jsonb AND
        jsonb_typeof("config_app"."value" -> 'tokenDigest') = 'string' AND
        "config_app"."value" ->> 'tokenDigest' ~ '^[0-9a-f]{64}$'
      )
    ) IS TRUE)
);
--> statement-breakpoint
CREATE TABLE "config_key" (
	"key" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"editor" text NOT NULL,
	"default_value" jsonb,
	CONSTRAINT "config_key_key_scope_unique" UNIQUE("key","scope"),
	CONSTRAINT "config_key_policy" CHECK (("config_key"."scope" = 'instance' AND "config_key"."editor" IN ('system','admin')) OR ("config_key"."scope" = 'user' AND "config_key"."editor" IN ('system','owner'))),
	CONSTRAINT "config_key_default" CHECK ("config_key"."default_value" IS NULL OR jsonb_typeof("config_key"."default_value") = 'object')
);
--> statement-breakpoint
CREATE TABLE "config_user" (
	"scope" text DEFAULT 'user' NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	CONSTRAINT "config_user_user_id_key_pk" PRIMARY KEY("user_id","key"),
	CONSTRAINT "config_user_scope" CHECK ("config_user"."scope" = 'user'),
	CONSTRAINT "config_user_object" CHECK (jsonb_typeof("config_user"."value") = 'object')
);
--> statement-breakpoint
ALTER TABLE "config_app" ADD CONSTRAINT "config_app_key_scope_config_key_key_scope_fk" FOREIGN KEY ("key","scope") REFERENCES "public"."config_key"("key","scope") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_user" ADD CONSTRAINT "config_user_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_user" ADD CONSTRAINT "config_user_key_scope_config_key_key_scope_fk" FOREIGN KEY ("key","scope") REFERENCES "public"."config_key"("key","scope") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "config_key" ("key", "scope", "editor", "default_value") VALUES
  ('admin_setup', 'instance', 'system', NULL),
  ('account_directory', 'instance', 'admin', '{"pageSize":25}'),
  ('account_display', 'user', 'owner', '{"menuLabel":"name"}');
--> statement-breakpoint
INSERT INTO "config_app" ("key", "value")
SELECT 'admin_setup', CASE WHEN EXISTS (SELECT 1 FROM "auth_user" WHERE "role" = 'admin')
  THEN '{"status":"closed"}'::jsonb ELSE '{"status":"pending"}'::jsonb END;
