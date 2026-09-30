"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createExpenditure,
  softDeleteExpenditure,
  updateExpenditure,
} from "@/db/queries/expenditures";
import { authorize } from "@/lib/auth/session";
import { expenditureSchema } from "@/lib/validation/expenditure";
import { type FormState, formValues, zodErrors } from "./types";

export async function createExpenditureAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await authorize("expenditure:create");
  const values = formValues(formData);
  if (!user)
    return { status: "error", errors: {}, values, message: "errors.forbidden" };

  const parsed = expenditureSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", errors: zodErrors(parsed.error), values };

  try {
    await createExpenditure(parsed.data, user.id);
  } catch {
    return { status: "error", errors: {}, values, message: "errors.generic" };
  }
  revalidatePath("/expenditures");
  revalidatePath("/dashboard");
  return {
    status: "success",
    errors: {},
    values: {
      expenditureDate: parsed.data.expenditureDate,
      _ts: String(Date.now()),
    },
    message: "expenditure.added",
  };
}

export async function updateExpenditureAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await authorize("expenditure:edit");
  const values = formValues(formData);
  if (!user)
    return { status: "error", errors: {}, values, message: "errors.forbidden" };

  const id = values.id;
  const parsed = expenditureSchema.safeParse(values);
  if (!id || !parsed.success) {
    return {
      status: "error",
      errors: parsed.success ? {} : zodErrors(parsed.error),
      values,
      message: parsed.success ? "errors.generic" : undefined,
    };
  }
  try {
    await updateExpenditure(id, parsed.data);
  } catch {
    return { status: "error", errors: {}, values, message: "errors.generic" };
  }
  revalidatePath("/expenditures");
  revalidatePath("/dashboard");
  redirect("/expenditures");
}

export async function deleteExpenditureAction(formData: FormData) {
  const user = await authorize("expenditure:delete");
  const id = String(formData.get("id") ?? "");
  if (!user || !id) return;
  await softDeleteExpenditure(id);
  revalidatePath("/expenditures");
  revalidatePath("/dashboard");
}
