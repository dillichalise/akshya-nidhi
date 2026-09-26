"use client";
import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createUserAction, resetPasswordAction, updateUserAction } from "@/actions/users";
import { idleState, type FormState } from "@/actions/types";
import { Alert, btnGhost, btnPrimary, Field, inputCls } from "./ui";

const ROLES = ["super_admin", "admin", "user"] as const;

function useForm(state: FormState) {
  const t = useTranslations();
  return {
    t,
    err: (f: string) => (state.errors[f] ? t(`errors.${state.errors[f]}`) : undefined),
    banner: state.message ? (
      <Alert kind={state.status === "success" ? "success" : "error"}>{t(state.message)}</Alert>
    ) : null,
  };
}

function RoleSelect({ defaultValue }: { defaultValue?: string }) {
  const t = useTranslations("users.roles");
  return (
    <select id="role" name="role" defaultValue={defaultValue ?? "user"} className={inputCls}>
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {t(r)}
        </option>
      ))}
    </select>
  );
}

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, idleState);
  const { t, err, banner } = useForm(state);
  const v = state.values;
  return (
    <form action={action} className="space-y-4" noValidate>
      {banner}
      <Field label={t("users.username")} name="username" error={err("username")}>
        <input id="username" name="username" defaultValue={v.username} autoCapitalize="none" autoComplete="off" className={inputCls} />
      </Field>
      <Field label={t("users.fullName")} name="fullName" error={err("fullName")}>
        <input id="fullName" name="fullName" defaultValue={v.fullName} autoComplete="off" className={inputCls} />
      </Field>
      <Field label={t("users.role")} name="role" error={err("role")}>
        <RoleSelect defaultValue={v.role} />
      </Field>
      <Field label={t("users.password")} name="password" error={err("password")} hint={t("users.passwordHint")}>
        <input id="password" name="password" type="text" autoComplete="off" className={inputCls} />
      </Field>
      <div className="flex gap-3 pt-2">
        <button className={btnPrimary} disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </button>
        <Link href="/users" className={btnGhost}>
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}

export function EditUserForm({
  user,
}: {
  user: { id: string; fullName: string; role: string; isActive: boolean };
}) {
  const [state, action, pending] = useActionState(updateUserAction, idleState);
  const { t, err, banner } = useForm(state);
  const v = state.values;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={user.id} />
      {banner}
      <Field label={t("users.fullName")} name="fullName" error={err("fullName")}>
        <input id="fullName" name="fullName" defaultValue={v.fullName ?? user.fullName} className={inputCls} />
      </Field>
      <Field label={t("users.role")} name="role" error={err("role")}>
        <RoleSelect defaultValue={v.role ?? user.role} />
      </Field>
      <Field label={t("users.status")} name="isActive">
        <select id="isActive" name="isActive" defaultValue={String(v.isActive ? v.isActive === "true" : user.isActive)} className={inputCls}>
          <option value="true">{t("users.active")}</option>
          <option value="false">{t("users.inactive")}</option>
        </select>
      </Field>
      <div className="flex gap-3 pt-2">
        <button className={btnPrimary} disabled={pending}>
          {pending ? t("common.saving") : t("common.save")}
        </button>
        <Link href="/users" className={btnGhost}>
          {t("common.back")}
        </Link>
      </div>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, idleState);
  const { t, err, banner } = useForm(state);
  return (
    // Remount after success so the password field is cleared.
    <form key={state.status === "success" ? "done" : "form"} action={action} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={userId} />
      {banner}
      <Field label={t("users.newPassword")} name="password" error={err("password")} hint={t("users.passwordHint")}>
        <input id="password" name="password" type="text" autoComplete="off" className={inputCls} />
      </Field>
      <button className={btnPrimary} disabled={pending}>
        {t("users.resetSubmit")}
      </button>
    </form>
  );
}
