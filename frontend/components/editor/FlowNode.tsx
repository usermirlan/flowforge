"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { GROUP_COLOR, TYPE_ICON, groupOf } from "@/lib/nodeStyle";
import type { FlowNodeData } from "@/lib/types";
import { useNodeStatus, useSpec } from "./status";

const HANDLE_LABEL: Record<string, string> = { true: "ооба", false: "жок" };

function summary(type: string, p: Record<string, unknown>): string {
  switch (type) {
    case "http.request":
      return `${p.method ?? "GET"} ${String(p.url ?? "").replace(/^https?:\/\//, "")}`;
    case "trigger.schedule":
      return String(p.cron ?? "");
    case "logic.if":
      return `${p.left ?? ""} ${p.operator ?? ""} ${p.right ?? ""}`;
    case "telegram.send":
    case "ai.prompt":
      return String(p.text ?? p.prompt ?? "");
    case "data.set":
      return (Array.isArray(p.fields) ? p.fields : []).map((f: { key?: string }) => f.key).filter(Boolean).join(", ");
    default:
      return "";
  }
}

function FlowNode({ id, type, data, selected }: NodeProps & { data: FlowNodeData }) {
  const spec = useSpec(type);
  const step = useNodeStatus(id);
  const color = GROUP_COLOR[groupOf(type)];
  const isTrigger = type.startsWith("trigger.");
  const handles = spec?.handles;
  const sub = summary(type, data.params ?? {});

  const ring =
    step?.status === "success" ? "border-ok" :
    step?.status === "error" ? "border-bad" :
    step?.status === "running" ? "border-accent node-running" :
    selected ? "border-accent" : "border-line";

  return (
    <div className={`w-56 rounded-xl border-2 bg-surface shadow-lg shadow-black/30 transition-colors ${ring}`}>
      {!isTrigger && <Handle type="target" position={Position.Left} />}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm"
          style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>
          {TYPE_ICON[type] ?? "●"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{data.label || spec?.label || type}</span>
          <span className="block truncate font-mono text-[10.5px] text-dim">{id}</span>
        </span>
        {step && (
          <span className={`text-xs ${step.status === "error" ? "text-bad" : step.status === "success" ? "text-ok" : "text-accent"}`}>
            {step.status === "success" ? "✓" : step.status === "error" ? "✕" : step.status === "skipped" ? "–" : "…"}
          </span>
        )}
      </div>
      {sub && <div className="truncate border-t border-line px-3 py-1.5 font-mono text-[11px] text-dim">{sub}</div>}
      {step?.duration_ms != null && step.status !== "running" && (
        <div className="border-t border-line px-3 py-1 text-[10.5px] text-dim">{step.duration_ms} мс</div>
      )}
      {handles ? (
        handles.map((h, i) => (
          <div key={h}>
            <Handle id={h} type="source" position={Position.Right} style={{ top: `${((i + 1) / (handles.length + 1)) * 100}%` }} />
            <span className="pointer-events-none absolute -right-11 text-[10.5px] text-dim"
              style={{ top: `calc(${((i + 1) / (handles.length + 1)) * 100}% - 8px)` }}>
              {HANDLE_LABEL[h] ?? h}
            </span>
          </div>
        ))
      ) : (
        <Handle type="source" position={Position.Right} />
      )}
    </div>
  );
}

export default memo(FlowNode);
