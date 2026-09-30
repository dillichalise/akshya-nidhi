CREATE TYPE "public"."donation_type" AS ENUM('cash', 'non_cash', 'other');--> statement-breakpoint
CREATE TABLE "expenditures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"return_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"expenditure_date" date NOT NULL,
	"remarks" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "expenditures_amount_positive" CHECK ("expenditures"."amount" > 0),
	CONSTRAINT "expenditures_return_nonneg" CHECK (return_amount >= 0),
	CONSTRAINT "expenditures_return_lte_amount" CHECK (return_amount <= "expenditures"."amount")
);
--> statement-breakpoint
ALTER TABLE "donations" DROP CONSTRAINT "donations_amount_positive";--> statement-breakpoint
ALTER TABLE "donations" ALTER COLUMN "amount" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "donation_type" "donation_type" DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "item_description" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "other_description" text;--> statement-breakpoint
ALTER TABLE "expenditures" ADD CONSTRAINT "expenditures_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenditures_date_active_idx" ON "expenditures" USING btree ("expenditure_date") WHERE "expenditures"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "expenditures_created_at_idx" ON "expenditures" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "donations_type_active_idx" ON "donations" USING btree ("donation_type") WHERE "donations"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_amount_nonneg" CHECK ("donations"."amount" >= 0);--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_non_cash_has_description" CHECK ("donations"."donation_type" != 'non_cash' OR "donations"."item_description" IS NOT NULL);