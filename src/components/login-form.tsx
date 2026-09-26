"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/actions/auth";
import { idleState } from "@/actions/types";
import { Alert, btnPrimary, Field, inputCls } from "./ui";

export function LoginForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(loginAction, idleState);
  return (
    <form action={action} className="space-y-4">
      {state.message && <Alert kind="error">{t(state.message)}</Alert>}
      <Field label={t("login.username")} name="username" error={state.errors.username && t(`errors.${state.errors.username}`)}>
        <input
          id="username"
          name="username"
          defaultValue={state.values.username}
          autoComplete="username"
          autoCapitalize="none"
          autoFocus
          className={inputCls}
        />
      </Field>
      <Field label={t("login.password")} name="password" error={state.errors.password && t(`errors.${state.errors.password}`)}>
        <input id="password" name="password" type="password" autoComplete="current-password" className={inputCls} />
      </Field>
      <button className={btnPrimary + " w-full"} disabled={pending}>
        {t("login.submit")}
      </button>
    </form>
  );
}
