import Link from "next/link";
import NewWorkflow from "@/components/NewWorkflow";
import StatusDot from "@/components/StatusDot";
import { api } from "@/lib/api";
import { ago } from "@/lib/format";
import { getDict } from "@/lib/locale";
import { TYPE_ICON } from "@/lib/nodeStyle";
import { requireToken } from "@/lib/session";
import type { WorkflowSummary } from "@/lib/types";

export async function generateMetadata() {
  return { title: (await getDict()).meta.workflows };
}

export default async function WorkflowsPage() {
  const token = await requireToken();
  const [workflows, d] = await Promise.all([api<WorkflowSummary[]>("/api/workflows", { token }), getDict()]);
  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-10 px-5 py-10">
      <div>
        <h1 className="text-2xl font-semibold">{d.list.title}</h1>
        <p className="mt-1 text-dim">{d.list.lead}</p>
      </div>
      <NewWorkflow />
      <section className="flex flex-col gap-2">
        {workflows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-dim">{d.list.empty}</p>
        ) : (
          workflows.map((w) => (
            <Link key={w.id} href={`/workflows/${w.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 transition hover:border-accent/50 hover:bg-raised">
              <span className="flex min-w-0 items-center gap-3">
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-raised text-sm">
                  {TYPE_ICON[w.trigger_type ?? ""] ?? "○"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{w.name}</span>
                  <span className="block text-xs text-dim">
                    {d.list.triggers[w.trigger_type ?? ""] ?? d.list.noTrigger} · {d.list.changed} {ago(w.updated_at, d)}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-4">
                {w.is_active && <span className="rounded-full bg-ok/15 px-2 py-0.5 text-xs font-medium text-ok">{d.list.active}</span>}
                <StatusDot status={w.last_status} />
                {w.last_run_at && <span className="text-xs text-dim">{ago(w.last_run_at, d)}</span>}
              </span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
