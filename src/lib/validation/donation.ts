import { z } from "zod";
import { todayInNepal } from "@/lib/format";
import { collapseSpaces, normalizePhone } from "./normalize";

// Error messages are translation keys under the `errors` namespace.
export const donationSchema = z
  .object({
    // Letters (Unicode), spaces, basic punctuation — no digits, no symbols.
    // Min 3, max 50, whitespace collapsed before validation.
    donorName: z
      .string()
      .transform(collapseSpaces)
      .pipe(
        z
          .string()
          .min(1, "required")
          .min(3, "name_too_short")
          .max(50, "name_too_long")
          .regex(/^[\p{L}\p{M}'\- ]+$/u, "name_invalid"),
      ),

    // Alphanumeric + basic punctuation: , . - :  Min 5, max 100.
    address: z
      .string()
      .transform(collapseSpaces)
      .pipe(
        z
          .string()
          .min(1, "required")
          .min(5, "address_too_short")
          .max(100, "address_too_long")
          .regex(/^[\p{L}\p{M}\d\s,.\-:]+$/u, "address_invalid"),
      ),

    // Nepal mobile: exactly 10 digits starting with 9 (after normalisation strips +977 prefix).
    phone: z
      .string()
      .transform(normalizePhone)
      .pipe(
        z
          .string()
          .min(1, "required")
          .regex(/^9\d{9}$/, "phone_nepal"),
      ),

    // Donation type: cash (amount required), non_cash (item required), or other (description required).
    donationType: z.enum(["cash", "non_cash", "other"]).default("cash"),

    // Item description — required when donationType = "non_cash".
    itemDescription: z
      .string()
      .trim()
      .max(200, "too_long")
      .optional()
      .transform((v) => (v ? v : null)),

    // Other description — required when donationType = "other".
    otherDescription: z
      .string()
      .trim()
      .max(500, "too_long")
      .optional()
      .transform((v) => (v ? v : null)),

    // Amount — required and > 0 for cash donations; optional (defaults to "0") for non-cash/other.
    amount: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v !== "" ? v : "0"))
      .pipe(
        z
          .string()
          .regex(/^\d{1,10}(\.\d{1,2})?$/, "amount_invalid")
          .refine((v) => Number(v) >= 0, "amount_invalid"),
      ),

    donationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date_invalid")
      .refine((v) => !Number.isNaN(Date.parse(v)), "date_invalid")
      .refine((v) => v <= todayInNepal(), "date_future"),

    remarks: z
      .string()
      .trim()
      .max(500, "too_long")
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .superRefine((data, ctx) => {
    // Cash donations must have amount > 0.
    if (data.donationType === "cash" && Number(data.amount) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amount_invalid",
        path: ["amount"],
      });
    }
    // Non-cash donations must have itemDescription.
    if (data.donationType === "non_cash" && !data.itemDescription) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "item_description_required",
        path: ["itemDescription"],
      });
    }
    // Other donations must have otherDescription.
    if (data.donationType === "other" && !data.otherDescription) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "other_description_required",
        path: ["otherDescription"],
      });
    }
  });

export type DonationInput = z.infer<typeof donationSchema>;

export const dateRangeSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date_invalid"),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date_invalid"),
  })
  .refine((v) => v.from <= v.to, { message: "range_invalid", path: ["to"] });
