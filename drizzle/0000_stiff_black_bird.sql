CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'admin', 'user');--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donor_name" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"donation_date" date NOT NULL,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "donations_amount_positive" CHECK ("donations"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"full_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_username_lowercase" CHECK ("users"."username" = lower("users"."username"))
);
--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "donations_date_active_idx" ON "donations" USING btree ("donation_date") WHERE "donations"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "donations_phone_active_idx" ON "donations" USING btree ("phone") WHERE "donations"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "donations_created_at_idx" ON "donations" USING btree ("created_at" DESC NULLS LAST);