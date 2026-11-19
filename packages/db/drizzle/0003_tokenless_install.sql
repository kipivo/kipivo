ALTER TABLE "config_app" DROP CONSTRAINT "config_app_admin_setup_state";--> statement-breakpoint
-- Never reopen a completed installation or grant an existing account administrator access.
UPDATE "config_app" SET "value" = CASE WHEN EXISTS (SELECT 1 FROM "auth_user")
  THEN '{"status":"closed"}'::jsonb ELSE '{"status":"pending"}'::jsonb END
WHERE "key" = 'admin_setup' AND "value"->>'status' <> 'closed';
--> statement-breakpoint
ALTER TABLE "config_app" ADD CONSTRAINT "config_app_admin_setup_state" CHECK ("config_app"."key" <> 'admin_setup' OR "config_app"."value" IN ('{"status":"pending"}'::jsonb, '{"status":"closed"}'::jsonb));
