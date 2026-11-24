const COLORS: Record<string, string> = {
  success: "bg-ok",
  error: "bg-bad",
  running: "bg-accent",
  queued: "bg-dim",
};
const LABELS: Record<string, string> = { success: "Ийгиликтүү", error: "Ката", running: "Иштеп жатат", queued: "Кезекте" };

export default function StatusDot({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-dim">— иштетиле элек</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-dim">
      <span className={`h-2 w-2 rounded-full ${COLORS[status] ?? "bg-dim"}`} />
      {LABELS[status] ?? status}
    </span>
  );
}
