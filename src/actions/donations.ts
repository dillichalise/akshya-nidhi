"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createDonation, softDeleteDonation, updateDonation } from "@/db/queries/donations";
import { authorize } from "@/lib/auth/session";
import { donationSchema } from "@/lib/validation/donation";
import { type FormState, formValues, zodErrors } from "./types";

export async function createDonationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await authorize("donation:create");
  const values = formValues(formData);
  if (!user) return { status: "error", errors: {}, values, message: "errors.forbidden" };

  const parsed = donationSchema.safeParse(values);
  if (!parsed.success) return { status: "error", errors: zodErrors(parsed.error), values };

  let row: { id: string } | undefined;
  try {
    row = await createDonation(parsed.data, user.id);
  } catch {
    return { status: "error", errors: {}, values, message: "errors.generic" };
  }
  revalidatePath("/donations");
  revalidatePath("/dashboard");
  // Keep the chosen date so several entries for the same day are quick.
  return {
    status: "success",
    errors: {},
    values: { donationDate: parsed.data.donationDate, _ts: String(Date.now()), receiptId: row?.id ?? "" },
    message: "donation.added",
  };
}

export async function updateDonationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await authorize("donation:edit");
  const values = formValues(formData);
  if (!user) return { status: "error", errors: {}, values, message: "errors.forbidden" };

  const id = values.id;
  const parsed = donationSchema.safeParse(values);
  if (!id || !parsed.success) {
    return { status: "error", errors: parsed.success ? {} : zodErrors(parsed.error), values, message: parsed.success ? "errors.generic" : undefined };
  }
  try {
    await updateDonation(id, parsed.data);
  } catch {
    return { status: "error", errors: {}, values, message: "errors.generic" };
  }
  revalidatePath("/donations");
  revalidatePath("/dashboard");
  redirect("/donations");
}

export async function deleteDonationAction(formData: FormData) {
  const user = await authorize("donation:delete");
  const id = String(formData.get("id") ?? "");
  if (!user || !id) return;
  await softDeleteDonation(id);
  revalidatePath("/donations");
  revalidatePath("/dashboard");
}
