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

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Always stored lowercase so login is case-insensitive.
    username: text("username").notNull().unique(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("users_username_lowercase", sql`${t.username} = lower(${t.username})`)],
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
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    donationDate: date("donation_date").notNull(),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    // Soft delete: NULL = active.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    check("donations_amount_positive", sql`${t.amount} > 0`),
    index("donations_date_active_idx")
      .on(t.donationDate)
      .where(sql`${t.deletedAt} is null`),
    index("donations_phone_active_idx")
      .on(t.phone)
      .where(sql`${t.deletedAt} is null`),
    index("donations_created_at_idx").on(t.createdAt.desc()),
  ],
);

export type User = typeof users.$inferSelect;
export type Donation = typeof donations.$inferSelect;
export type Role = (typeof userRole.enumValues)[number];
