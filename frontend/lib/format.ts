export function ago(iso: string | null): string {
  if (!iso) return "";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s} сек мурун`;
  if (s < 3600) return `${Math.round(s / 60)} мүн мурун`;
  if (s < 86400) return `${Math.round(s / 3600)} саат мурун`;
  return new Date(iso).toLocaleDateString("ky-KG", { day: "numeric", month: "short" });
}
