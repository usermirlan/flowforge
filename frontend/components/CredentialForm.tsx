"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createCredential } from "@/app/actions";
import type { CredentialType } from "@/lib/types";

export default function CredentialForm({ types }: { types: Record<string, CredentialType> }) {
  const keys = Object.keys(types);
  const [type, setType] = useState(keys[0]);
  const [state, action, pending] = useActionState(createCredential, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) form.current?.reset(); }, [state]);
  const input = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent";
  return (
    <form ref={form} action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-semibold">Жаңы ачкыч</h2>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-dim">Түрү</span>
        <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={input}>
          {keys.map((k) => <option key={k} value={k}>{types[k].label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-dim">Аты</span>
        <input name="name" required maxLength={80} placeholder="Мисалы: Менин ботум" className={input} />
      </label>
      {types[type].fields.map((f) => (
        <label key={`${type}:${f.name}`} className="flex flex-col gap-1.5 text-sm">
          <span className="text-dim">{f.label}</span>
          <input name={`field_${f.name}`} type={f.secret ? "password" : "text"} defaultValue={f.default ?? ""}
            required={f.secret} autoComplete="off" spellCheck={false} className={`${input} font-mono`} />
        </label>
      ))}
      {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-ok">Сакталды — шифрленген түрдө.</p>}
      <button disabled={pending} className="rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">Сактоо</button>
      <p className="text-xs leading-relaxed text-dim">Купуя маанилер серверде Fernet менен шифрленип сакталат жана кайра эч качан толук көрсөтүлбөйт.</p>
    </form>
  );
}
