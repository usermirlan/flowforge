"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions";
import { LOCALES } from "@/lib/i18n";
import { useI18n } from "./I18n";

const LABEL = { ky: "КЫР", ru: "РУС" } as const;

export default function LangSwitch() {
  const { locale, d } = useI18n();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label={d.nav.lang} className={`flex overflow-hidden rounded-md border border-line text-xs ${pending ? "opacity-60" : ""}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          disabled={pending}
          onClick={() => l !== locale && start(() => setLocale(l))}
          className={`px-2 py-1.5 font-medium ${l === locale ? "bg-raised text-fg" : "text-dim hover:text-fg"}`}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
