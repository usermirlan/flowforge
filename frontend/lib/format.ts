import type { Dict } from "./i18n";

export function ago(iso: string | null, d: Dict): string {
  if (!iso) return "";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s} ${d.ago.sec}`;
  if (s < 3600) return `${Math.round(s / 60)} ${d.ago.min}`;
  if (s < 86400) return `${Math.round(s / 3600)} ${d.ago.hour}`;
  return new Date(iso).toLocaleDateString(d.ago.intl, { day: "numeric", month: "short" });
}
