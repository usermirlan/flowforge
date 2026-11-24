"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Credential, FlowNodeData, NodeSpec, ParamSpec, Step } from "@/lib/types";

const base = "rounded-lg border border-line bg-bg px-2.5 py-2 text-sm outline-none focus:border-accent";
const input = `w-full ${base}`;

function JsonField({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [text, setText] = useState(() => (value == null ? "" : JSON.stringify(value, null, 2)));
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <textarea
        value={text}
        rows={4}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (!text.trim()) { setErr(null); onChange(null); return; }
          try { onChange(JSON.parse(text)); setErr(null); }
          catch { setErr("JSON туура эмес"); }
        }}
        className={`${input} font-mono text-xs`}
      />
      {err && <span className="text-xs text-bad">{err}</span>}
    </>
  );
}

function FieldsField({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const rows = (Array.isArray(value) ? value : []) as { key: string; value: string }[];
  const set = (i: number, k: "key" | "value", v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-1.5">
          <input aria-label="Ачкыч" value={r.key} onChange={(e) => set(i, "key", e.target.value)} placeholder="key" className={`${base} w-24 shrink-0 font-mono text-xs`} />
          <input aria-label="Маани" value={r.value} onChange={(e) => set(i, "value", e.target.value)} placeholder="{{ … }}" className={`${base} min-w-0 flex-1 font-mono text-xs`} />
          <button type="button" aria-label="Өчүрүү" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="px-1.5 text-dim hover:text-bad">✕</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { key: "", value: "" }])} className="self-start text-xs text-accent hover:underline">
        + талаа кошуу
      </button>
    </div>
  );
}

function Param({ spec, value, onChange }: { spec: ParamSpec; value: unknown; onChange: (v: unknown) => void }) {
  let control: React.ReactNode;
  switch (spec.kind) {
    case "textarea":
      control = <textarea value={String(value ?? "")} rows={4} onChange={(e) => onChange(e.target.value)} className={`${input} font-mono text-xs`} />;
      break;
    case "select":
      control = (
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={input}>
          {spec.options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
      break;
    case "bool":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="accent-[var(--color-accent)]" />
          {spec.label}
        </label>
      );
    case "json":
      control = <JsonField value={value} onChange={onChange} />;
      break;
    case "fields":
      control = <FieldsField value={value} onChange={onChange} />;
      break;
    default:
      control = <input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={`${input} font-mono text-xs`} />;
  }
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-dim">{spec.label}</span>
      {control}
      {spec.help && <span className="text-xs text-dim">{spec.help}</span>}
    </label>
  );
}

export default function ConfigPanel(props: {
  nodeId: string;
  type: string;
  data: FlowNodeData;
  spec: NodeSpec | undefined;
  upstream: string[];
  credentials: Credential[];
  webhookUrl: string;
  step?: Step;
  onChange: (data: FlowNodeData) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { nodeId, type, data, spec, upstream, credentials, webhookUrl, step, onChange } = props;
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => setCopied(null), [nodeId]);

  const setParam = (name: string, v: unknown) => onChange({ ...data, params: { ...data.params, [name]: v } });
  const copy = (s: string) => {
    navigator.clipboard?.writeText(s).catch(() => {});
    setCopied(s);
  };
  const creds = spec?.credential ? credentials.filter((c) => c.type === spec.credential) : [];

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-l border-line bg-surface">
      <div className="flex items-start justify-between gap-2 border-b border-line p-4">
        <div className="min-w-0">
          <p className="text-xs text-dim">{spec?.label ?? type}</p>
          <input
            aria-label="Блоктун аты"
            value={data.label}
            onChange={(e) => onChange({ ...data, label: e.target.value })}
            className="mt-0.5 w-full bg-transparent text-base font-semibold outline-none"
          />
          <p className="font-mono text-xs text-dim">{nodeId}</p>
        </div>
        <button onClick={props.onClose} aria-label="Жабуу" className="rounded p-1 text-dim hover:bg-raised hover:text-fg">✕</button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {spec?.description && <p className="text-sm leading-relaxed text-dim">{spec.description}</p>}

        {type === "trigger.webhook" && (
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="text-dim">Webhook URL (POST)</span>
            <button onClick={() => copy(webhookUrl)} className="break-all rounded-lg border border-line bg-bg p-2.5 text-left font-mono text-xs hover:border-accent">
              {webhookUrl}
            </button>
            <span className="text-xs text-dim">{copied === webhookUrl ? "Көчүрүлдү ✓" : "Басып көчүрүңүз. Workflow активдүү болгондо гана иштейт."}</span>
          </div>
        )}

        {spec?.credential && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-dim">Ачкыч {spec.credential_optional && "(милдеттүү эмес)"}</span>
            <select
              value={data.credentialId ?? ""}
              onChange={(e) => onChange({ ...data, credentialId: e.target.value ? Number(e.target.value) : null })}
              className={input}
            >
              <option value="">{spec.credential_optional ? "Сервердин ачкычы" : "— тандаңыз —"}</option>
              {creds.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Link href="/credentials" className="text-xs text-accent hover:underline">+ жаңы ачкыч кошуу</Link>
          </label>
        )}

        {spec?.params.map((p) => <Param key={`${nodeId}:${p.name}`} spec={p} value={data.params?.[p.name]} onChange={(v) => setParam(p.name, v)} />)}

        {!type.startsWith("trigger.") && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(data.continueOnError)} onChange={(e) => onChange({ ...data, continueOnError: e.target.checked })} className="accent-[var(--color-accent)]" />
            Ката болсо да улантуу
          </label>
        )}

        <div className="rounded-lg border border-line bg-bg p-3 text-xs">
          <p className="mb-2 font-medium text-dim">Өзгөрмөлөр (басып көчүрүңүз)</p>
          <div className="flex flex-wrap gap-1.5">
            {["{{ trigger }}", "{{ input }}", ...upstream.map((u) => `{{ nodes.${u} }}`)].map((v) => (
              <button key={v} onClick={() => copy(v)} className={`rounded border px-1.5 py-0.5 font-mono ${copied === v ? "border-ok text-ok" : "border-line hover:border-accent"}`}>
                {v}
              </button>
            ))}
          </div>
          <p className="mt-2 text-dim">Ичкери кирүү: <code className="font-mono">{"{{ nodes.http_1.body.items[0].name }}"}</code></p>
        </div>

        {step && (
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="text-dim">Акыркы натыйжа</span>
            {step.error && <p className="rounded-lg border border-bad/40 bg-bad/10 p-2.5 text-xs text-bad">{step.error}</p>}
            {step.output !== undefined && step.output !== null && (
              <pre className="max-h-72 overflow-auto rounded-lg border border-line bg-bg p-2.5 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(step.output, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-line p-3">
        <button onClick={props.onDelete} className="w-full rounded-lg border border-line py-2 text-sm text-bad hover:bg-bad/10">Блокту өчүрүү</button>
      </div>
    </aside>
  );
}
