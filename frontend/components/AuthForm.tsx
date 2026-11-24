"use client";

import Link from "next/link";
import { useActionState } from "react";
import { authenticate } from "@/app/actions";
import { useI18n } from "./I18n";

export default function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, action, pending] = useActionState(authenticate, {});
  const { d } = useI18n();
  const input = "w-full rounded-lg border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent";
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next ?? ""} />
      {mode === "register" && (
        <label className="flex flex-col gap-1.5 text-sm">
          {d.auth.name}
          <input name="name" required maxLength={80} autoComplete="name" className={input} />
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-sm">
        {d.auth.email}
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        {d.auth.password}
        <input name="password" type="password" required minLength={8}
          autoComplete={mode === "register" ? "new-password" : "current-password"} className={input} />
      </label>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button disabled={pending} className="rounded-lg bg-accent py-2.5 font-medium text-white hover:brightness-110 disabled:opacity-60">
        {pending ? "…" : mode === "register" ? d.auth.register : d.auth.login}
      </button>
      <p className="text-center text-sm text-dim">
        {mode === "register" ? (
          <>{d.auth.haveAccount} <Link href="/login" className="text-accent hover:underline">{d.auth.login}</Link></>
        ) : (
          <>{d.auth.noAccount} <Link href="/register" className="text-accent hover:underline">{d.auth.register}</Link></>
        )}
      </p>
    </form>
  );
}
