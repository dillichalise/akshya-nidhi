import { z } from "zod";
import { todayInNepal } from "@/lib/format";

export const expenditureSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "required")
      .min(3, "title_too_short")
      .max(100, "title_too_long"),

    // Gross amount paid out — same pattern as donationSchema.amount but > 0.
    amount: z
      .string()
      .trim()
      .regex(/^\d{1,10}(\.\d{1,2})?$/, "amount_invalid")
      .refine((v) => Number(v) > 0, "amount_invalid"),

    // Return amount — optional (defaults to "0"), must be >= 0 and <= amount.
    returnAmount: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v !== "" ? v : "0"))
      .pipe(
        z
          .string()
          .regex(/^\d{1,10}(\.\d{1,2})?$/, "return_amount_invalid")
          .refine((v) => Number(v) >= 0, "return_amount_invalid"),
      ),

    expenditureDate: z
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
  .refine(
    (d) => Number(d.returnAmount) <= Number(d.amount),
    { message: "return_exceeds_amount", path: ["returnAmount"] },
  );

export type ExpenditureInput = z.infer<typeof expenditureSchema>;
