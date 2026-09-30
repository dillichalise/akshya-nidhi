import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["super_admin", "admin", "user"]);

export const donationType = pgEnum("donation_type", [
  "cash",
  "non_cash",
  "other",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Always stored lowercase so login is case-insensitive.
    username: text("username").notNull().unique(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    phone: text("phone").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "users_username_lowercase",
      sql`${t.username} = lower(${t.username})`,
    ),
  ],
);

export const donations = pgTable(
  "donations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    donorName: text("donor_name").notNull(),
    address: text("address").notNull(),
    // Not unique. Stored normalized (digits only, +977 stripped).
    phone: text("phone").notNull(),
    // NPR. numeric(12,2) is returned as a string — never parseFloat it for math.
    amount: numeric("amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    // donation_type defaults to 'cash' — existing rows are backfilled by the DEFAULT.
    donationType: donationType("donation_type").notNull().default("cash"),
    // Populated when donationType = 'non_cash' — what item was donated.
    itemDescription: text("item_description"),
    // Populated when donationType = 'other' — free-text description.
    otherDescription: text("other_description"),
    donationDate: date("donation_date").notNull(),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Soft delete: NULL = active.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    // Cash donations must have amount > 0; non-cash/other may have amount = 0.
    check("donations_amount_nonneg", sql`${t.amount} >= 0`),
    check(
      "donations_non_cash_has_description",
      sql`${t.donationType} != 'non_cash' OR ${t.itemDescription} IS NOT NULL`,
    ),
    index("donations_date_active_idx")
      .on(t.donationDate)
      .where(sql`${t.deletedAt} is null`),
    index("donations_phone_active_idx")
      .on(t.phone)
      .where(sql`${t.deletedAt} is null`),
    index("donations_type_active_idx")
      .on(t.donationType)
      .where(sql`${t.deletedAt} is null`),
    index("donations_created_at_idx").on(t.createdAt.desc()),
  ],
);

export const expenditures = pgTable(
  "expenditures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    // Gross amount paid out. numeric(12,2) returned as string — never parseFloat for math.
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    // Amount returned after purchase; actual spend = amount − returnAmount.
    returnAmount: numeric("return_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    expenditureDate: date("expenditure_date").notNull(),
    remarks: text("remarks"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Soft delete: NULL = active.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    check("expenditures_amount_positive", sql`${t.amount} > 0`),
    check("expenditures_return_nonneg", sql`return_amount >= 0`),
    check("expenditures_return_lte_amount", sql`return_amount <= ${t.amount}`),
    index("expenditures_date_active_idx")
      .on(t.expenditureDate)
      .where(sql`${t.deletedAt} is null`),
    index("expenditures_created_at_idx").on(t.createdAt.desc()),
  ],
);

export type User = typeof users.$inferSelect;
export type Donation = typeof donations.$inferSelect;
export type Expenditure = typeof expenditures.$inferSelect;
export type Role = (typeof userRole.enumValues)[number];
export type DonationType = (typeof donationType.enumValues)[number];
