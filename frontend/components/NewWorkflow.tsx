"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createWorkflow } from "@/app/actions";
import { TEMPLATES } from "@/lib/templates";
import type { Graph } from "@/lib/types";

export default function NewWorkflow() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function create(n: string, graph?: Graph, description = "") {
    setError(null);
    start(async () => {
      const r = await createWorkflow(n, graph, description);
      if (r.ok) router.push(`/workflows/${r.data.id}`);
      else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create(name.trim());
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Жаңы workflow'дун аты"
          aria-label="Жаңы workflow'дун аты"
          maxLength={120}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 outline-none focus:border-accent"
        />
        <button disabled={pending || !name.trim()} className="rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:brightness-110 disabled:opacity-50">
          + Түзүү
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <div>
        <h2 className="mb-3 text-sm font-medium text-dim">Же даяр үлгүдөн баштаңыз</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              disabled={pending}
              onClick={() => create(t.name, t.graph, t.description)}
              className="rounded-xl border border-line bg-surface p-4 text-left transition hover:border-accent/60 hover:bg-raised disabled:opacity-60"
            >
              <span className="block font-medium">{t.name}</span>
              <span className="mt-1 block text-sm leading-relaxed text-dim">{t.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
