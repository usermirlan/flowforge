"use client";

import { useI18n } from "./I18n";

const COLORS: Record<string, string> = { success: "bg-ok", error: "bg-bad", running: "bg-accent", queued: "bg-dim" };

export default function StatusDot({ status }: { status: string | null }) {
  const { d } = useI18n();
  if (!status) return <span className="text-xs text-dim">{d.status.never}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-dim">
      <span className={`h-2 w-2 rounded-full ${COLORS[status] ?? "bg-dim"}`} />
      {d.status[status] ?? status}
    </span>
  );
}
