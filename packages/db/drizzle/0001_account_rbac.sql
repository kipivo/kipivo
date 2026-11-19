CREATE TYPE "public"."account_role" AS ENUM('member', 'admin');--> statement-breakpoint
ALTER TABLE "auth_user" ADD COLUMN "role" "account_role" DEFAULT 'member' NOT NULL;