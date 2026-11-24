"use client";

import { createContext, useContext } from "react";
import { DICTS, type Dict, type Locale } from "@/lib/i18n";

const Ctx = createContext<{ locale: Locale; d: Dict }>({ locale: "ky", d: DICTS.ky });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, d: DICTS[locale] }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
