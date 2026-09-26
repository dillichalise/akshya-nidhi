import type { ZodError } from "zod";

/** State returned by form server actions. Error values are keys under the `errors` namespace. */
export type FormState = {
  status: "idle" | "success" | "error";
  /** field name -> error key */
  errors: Record<string, string>;
  /** submitted values, so the form can be re-populated on error */
  values: Record<string, string>;
  /** key under a namespace shown on success (e.g. "donation.added") or a general error key */
  message?: string;
};

export const idleState: FormState = { status: "idle", errors: {}, values: {} };

export function zodErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "_");
    out[field] ??= issue.message;
  }
  return out;
}

export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$ACTION") && k !== "password") out[k] = v;
  }
  return out;
}

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}
