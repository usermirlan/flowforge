import "server-only";
import { cookies } from "next/headers";
import { DICTS, isLocale, LOCALE_COOKIE, type Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : "ky";
}

export async function getDict() {
  return DICTS[await getLocale()];
}
