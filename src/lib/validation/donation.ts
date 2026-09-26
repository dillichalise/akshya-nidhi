import { z } from "zod";
import { todayInNepal } from "@/lib/format";
import { collapseSpaces, normalizePhone } from "./normalize";

// Error messages are translation keys under the `errors` namespace.
export const donationSchema = z.object({
  donorName: z.string().transform(collapseSpaces).pipe(z.string().min(1, "required").max(120, "too_long")),
  address: z.string().transform(collapseSpaces).pipe(z.string().min(1, "required").max(250, "too_long")),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().min(1, "required").regex(/^\d{7,15}$/, "phone_invalid")),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, "amount_invalid")
    .refine((v) => Number(v) > 0, "amount_invalid"),
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
});

export type DonationInput = z.infer<typeof donationSchema>;

export const dateRangeSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date_invalid"),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date_invalid"),
  })
  .refine((v) => v.from <= v.to, { message: "range_invalid", path: ["to"] });
