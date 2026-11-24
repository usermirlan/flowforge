"use client";

import Link from "next/link";
import { useActionState } from "react";
import { authenticate } from "@/app/actions";

export default function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, action, pending] = useActionState(authenticate, {});
  const input = "w-full rounded-lg border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent";
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next ?? ""} />
      {mode === "register" && (
        <label className="flex flex-col gap-1.5 text-sm">
          Атыңыз
          <input name="name" required maxLength={80} autoComplete="name" className={input} />
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-sm">
        Email
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        Сырсөз
        <input name="password" type="password" required minLength={8}
          autoComplete={mode === "register" ? "new-password" : "current-password"} className={input} />
      </label>
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button disabled={pending} className="rounded-lg bg-accent py-2.5 font-medium text-white hover:brightness-110 disabled:opacity-60">
        {pending ? "…" : mode === "register" ? "Катталуу" : "Кирүү"}
      </button>
      <p className="text-center text-sm text-dim">
        {mode === "register" ? (
          <>Аккаунтуңуз барбы? <Link href="/login" className="text-accent hover:underline">Кирүү</Link></>
        ) : (
          <>Аккаунт жокпу? <Link href="/register" className="text-accent hover:underline">Катталуу</Link></>
        )}
      </p>
    </form>
  );
}
