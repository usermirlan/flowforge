"use client";

import "@xyflow/react/dist/style.css";
import {
  addEdge, Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider,
  useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type Node,
} from "@xyflow/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteWorkflow, listExecutions, saveWorkflow, setActive } from "@/app/actions";
import { ago } from "@/lib/format";
import { GROUP_COLOR, GROUP_LABEL, TYPE_ICON } from "@/lib/nodeStyle";
import type { Catalog, Credential, Execution, FlowNodeData, Graph, NodeSpec, Workflow } from "@/lib/types";
import StatusDot from "../StatusDot";
import ConfigPanel from "./ConfigPanel";
import FlowNode from "./FlowNode";
import { CatalogContext, StatusContext, defaultParams, nextNodeId } from "./status";
import { useRun } from "./useRun";

type FNode = Node<FlowNodeData>;

function toFlow(g: Graph): { nodes: FNode[]; edges: Edge[] } {
  return {
    nodes: g.nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: { ...n.data, params: n.data?.params ?? {}, label: n.data?.label ?? "" } })),
    edges: g.edges.map((e) => ({ ...e, sourceHandle: e.sourceHandle ?? null })),
  };
}

function toGraph(nodes: FNode[], edges: Edge[]): Graph {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: n.type!, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) }, data: n.data })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null })),
  };
}

function Palette({ specs, onAdd }: { specs: NodeSpec[]; onAdd: (type: string) => void }) {
  const groups = (Object.keys(GROUP_LABEL) as NodeSpec["group"][])
    .map((g) => [g, specs.filter((s) => s.group === g)] as const)
    .filter(([, list]) => list.length);
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-line bg-surface p-4 md:flex">
      <p className="text-xs text-dim">Сүйрөп таштаңыз же басыңыз</p>
      {groups.map(([g, list]) => (
        <div key={g} className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: GROUP_COLOR[g] }}>{GROUP_LABEL[g]}</h3>
          {list.map((s) => (
            <button
              key={s.type}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData("application/flowforge", s.type); e.dataTransfer.effectAllowed = "move"; }}
              onClick={() => onAdd(s.type)}
              title={s.description}
              className="flex cursor-grab items-center gap-2.5 rounded-lg border border-line bg-bg px-2.5 py-2 text-left text-sm hover:border-accent/60 active:cursor-grabbing"
            >
              <span className="w-5 text-center" style={{ color: GROUP_COLOR[g] }}>{TYPE_ICON[s.type] ?? "●"}</span>
              {s.label}
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}

function Canvas(props: { workflow: Workflow; catalog: Catalog; credentials: Credential[]; wsBase: string }) {
  const { catalog, credentials, wsBase } = props;
  const [wf, setWf] = useState(props.workflow);
  const initial = useMemo(() => toFlow(props.workflow.graph), [props.workflow.graph]);
  const [nodes, setNodes, onNodesChange] = useNodesState<FNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [name, setName] = useState(wf.name);
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [tab, setTab] = useState<"run" | "history" | null>(null);
  const [payload, setPayload] = useState('{\n  "name": "Айбек"\n}');
  const [history, setHistory] = useState<Execution[]>([]);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const { run, start, show, clear } = useRun(wf.id, wsBase);
  const wrapper = useRef<HTMLDivElement>(null);

  const specs = useMemo(() => Object.fromEntries(catalog.nodes.map((n) => [n.type, n])), [catalog]);
  const nodeTypes = useMemo(() => Object.fromEntries(catalog.nodes.map((n) => [n.type, FlowNode])), [catalog]);
  const triggerType = nodes.find((n) => n.type?.startsWith("trigger."))?.type;

  // mark dirty on structural edits (not on selection/dimension changes)
  const onNodesChangeTracked: typeof onNodesChange = (changes) => {
    if (changes.some((c) => c.type === "remove" || c.type === "add" || (c.type === "position" && c.dragging === false))) setDirty(true);
    if (changes.some((c) => c.type === "remove" && c.id === selected)) setSelected(null);
    onNodesChange(changes);
  };
  const onEdgesChangeTracked: typeof onEdgesChange = (changes) => {
    if (changes.some((c) => c.type === "remove")) setDirty(true);
    onEdgesChange(changes);
  };

  const onConnect = useCallback((c: Connection) => {
    if (c.source === c.target) return;
    setEdges((es) => addEdge({ ...c, id: `e_${c.source}_${c.sourceHandle ?? "out"}_${c.target}` }, es));
    setDirty(true);
  }, [setEdges]);

  const addNode = useCallback((type: string, position?: { x: number; y: number }) => {
    const spec = specs[type];
    if (!spec) return;
    if (type.startsWith("trigger.") && nodes.some((n) => n.type?.startsWith("trigger."))) {
      setMsg({ kind: "bad", text: "Workflow'до бир гана триггер болот — алгач эскисин өчүрүңүз." });
      return;
    }
    const id = nextNodeId(type, new Set(nodes.map((n) => n.id)));
    const rect = wrapper.current?.getBoundingClientRect();
    const pos = position ?? screenToFlowPosition({ x: (rect?.left ?? 0) + (rect?.width ?? 800) / 2 - 110, y: (rect?.top ?? 0) + (rect?.height ?? 600) / 2 - 40 });
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { id, type, position: pos, selected: true, data: { label: spec.label, params: defaultParams(spec) } }]);
    setSelected(id);
    setDirty(true);
  }, [specs, nodes, screenToFlowPosition, setNodes]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/flowforge");
    if (type) addNode(type, screenToFlowPosition({ x: e.clientX - 110, y: e.clientY - 30 }));
  };

  const updateData = (id: string, data: FlowNodeData) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data } : n)));
    setDirty(true);
  };

  const save = useCallback(async (): Promise<boolean> => {
    const r = await saveWorkflow(wf.id, name.trim() || "Аталышсыз", wf.description, toGraph(nodes, edges));
    if (!r.ok) { setMsg({ kind: "bad", text: r.error }); return false; }
    setWf(r.data);
    setDirty(false);
    setMsg(r.data.problems.length ? { kind: "bad", text: r.data.problems.join(" · ") } : { kind: "ok", text: "Сакталды" });
    return true;
  }, [wf.id, wf.description, name, nodes, edges]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); startSave(async () => { await save(); }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  useEffect(() => {
    if (!msg || msg.kind === "bad") return;
    const t = setTimeout(() => setMsg(null), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  const doRun = () => startSave(async () => {
    let body: Record<string, unknown> = {};
    if (payload.trim()) {
      try { body = JSON.parse(payload); } catch { setMsg({ kind: "bad", text: "Киргизүү JSON туура эмес" }); return; }
    }
    // a manual test of a webhook flow should look like a real request
    if (triggerType === "trigger.webhook") body = { body, query: {}, headers: {} };
    if (dirty && !(await save())) return;
    setTab("run");
    const err = await start(body);
    if (err) setMsg({ kind: "bad", text: err });
  });

  const toggleActive = () => startSave(async () => {
    if (dirty && !(await save())) return;
    const r = await setActive(wf.id, !wf.is_active);
    if (r.ok) { setWf(r.data); setMsg({ kind: "ok", text: r.data.is_active ? "Активдештирилди" : "Токтотулду" }); }
    else setMsg({ kind: "bad", text: r.error });
  });

  const openHistory = async () => {
    setTab(tab === "history" ? null : "history");
    setHistory(await listExecutions(wf.id));
  };
  useEffect(() => {
    if (run.status === "success" || run.status === "error") listExecutions(wf.id).then(setHistory);
  }, [run.status, wf.id]);

  const sel = nodes.find((n) => n.id === selected);
  const upstream = useMemo(() => {
    if (!selected) return [];
    const seen = new Set<string>();
    const stack = [selected];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const e of edges) if (e.target === cur && !seen.has(e.source)) { seen.add(e.source); stack.push(e.source); }
    }
    return nodes.filter((n) => seen.has(n.id) && !n.type?.startsWith("trigger.")).map((n) => n.id);
  }, [selected, edges, nodes]);

  const animated = useMemo(
    () => edges.map((e) => ({ ...e, animated: run.steps[e.source]?.status === "success" && run.steps[e.target]?.status === "running" })),
    [edges, run.steps],
  );

  const btn = "rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-raised disabled:opacity-50";
  const runnable = triggerType === "trigger.manual" || triggerType === "trigger.webhook" || triggerType === "trigger.schedule";

  return (
    <CatalogContext.Provider value={specs}>
      <StatusContext.Provider value={run.steps}>
        <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
          {/* toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
            <Link href="/workflows" className="rounded p-1.5 text-dim hover:bg-raised hover:text-fg" aria-label="Артка">←</Link>
            <input
              aria-label="Workflow'дун аты"
              value={name}
              onChange={(e) => { setName(e.target.value); setDirty(true); }}
              className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 font-medium outline-none hover:bg-raised focus:bg-raised sm:max-w-sm"
            />
            {dirty && <span className="text-xs text-dim">● сакталган жок</span>}
            {msg && <span role="status" className={`max-w-md truncate text-xs ${msg.kind === "ok" ? "text-ok" : "text-bad"}`} title={msg.text}>{msg.text}</span>}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button onClick={openHistory} className={btn}>Тарых</button>
              <button onClick={() => startSave(async () => { await save(); })} disabled={saving} className={btn}>Сактоо</button>
              {triggerType && triggerType !== "trigger.manual" && (
                <button onClick={toggleActive} disabled={saving}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${wf.is_active ? "border-ok/50 text-ok" : "border-line"} hover:bg-raised`}>
                  <span className={`h-2 w-2 rounded-full ${wf.is_active ? "bg-ok" : "bg-dim"}`} />
                  {wf.is_active ? "Активдүү" : "Активдештирүү"}
                </button>
              )}
              <button onClick={() => setTab(tab === "run" ? null : "run")} disabled={!runnable}
                className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
                ▶ Иштетүү
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1">
            <Palette specs={catalog.nodes} onAdd={(t) => addNode(t)} />
            <div ref={wrapper} className="relative min-w-0 flex-1" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={onDrop}>
              <ReactFlow
                nodes={nodes}
                edges={animated}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChangeTracked}
                onEdgesChange={onEdgesChangeTracked}
                onConnect={onConnect}
                onNodeClick={(_, n) => setSelected(n.id)}
                onPaneClick={() => setSelected(null)}
                deleteKeyCode={["Backspace", "Delete"]}
                fitView
                fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
                proOptions={{ hideAttribution: true }}
                colorMode="dark"
              >
                <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#2a2f3b" />
                <Controls showInteractive={false} />
                <MiniMap pannable zoomable nodeColor="#2a2f3b" maskColor="rgba(10,11,15,.7)" className="!hidden lg:!block" />
              </ReactFlow>
              {nodes.length === 0 && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-dim">Сол жактан триггер кошуудан баштаңыз</div>
              )}

              {/* bottom drawer: run / history */}
              {tab && (
                <div className="absolute inset-x-3 bottom-3 z-10 max-h-[45%] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl shadow-black/50">
                  <div className="flex items-center justify-between border-b border-line px-4 py-2">
                    <span className="text-sm font-medium">{tab === "run" ? "Иштетүү" : "Иштетүүлөр тарыхы"}</span>
                    <button onClick={() => setTab(null)} aria-label="Жабуу" className="text-dim hover:text-fg">✕</button>
                  </div>
                  {tab === "run" ? (
                    <div className="grid gap-4 overflow-y-auto p-4 md:grid-cols-[1fr_1.4fr]" style={{ maxHeight: "calc(45vh - 3rem)" }}>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-dim" htmlFor="payload">
                          Киргизүү (JSON) — {triggerType === "trigger.webhook" ? "webhook'тун body'си катары" : "триггердин маалыматы"}
                        </label>
                        <textarea id="payload" value={payload} onChange={(e) => setPayload(e.target.value)} rows={6} spellCheck={false}
                          className="rounded-lg border border-line bg-bg p-2.5 font-mono text-xs outline-none focus:border-accent" />
                        <button onClick={doRun} disabled={saving || run.status === "running" || run.status === "queued"}
                          className="rounded-lg bg-accent py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
                          {run.status === "running" || run.status === "queued" ? "Иштеп жатат…" : "▶ Азыр иштетүү"}
                        </button>
                      </div>
                      <div className="flex min-w-0 flex-col gap-2 text-sm">
                        <div className="flex items-center gap-3">
                          <StatusDot status={run.status} />
                          {run.executionId && <span className="truncate font-mono text-xs text-dim">{run.executionId.slice(0, 8)}</span>}
                          {run.status && <button onClick={clear} className="ml-auto text-xs text-dim hover:text-fg">тазалоо</button>}
                        </div>
                        {run.error && <p className="rounded-lg border border-bad/40 bg-bad/10 p-2.5 text-xs text-bad">{run.error}</p>}
                        {Object.values(run.steps).map((s) => (
                          <button key={s.node_id} onClick={() => setSelected(s.node_id)}
                            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg px-3 py-2 text-left hover:border-accent/60">
                            <span className="truncate font-mono text-xs">{s.node_id}</span>
                            <span className={`text-xs ${s.status === "error" ? "text-bad" : s.status === "success" ? "text-ok" : "text-dim"}`}>
                              {s.status}{s.duration_ms != null && s.status !== "running" ? ` · ${s.duration_ms} мс` : ""}
                            </span>
                          </button>
                        ))}
                        {!run.status && <p className="text-xs text-dim">Иштеткенде ар бир блоктун абалы ушул жерде жана канваста тирүү көрүнөт.</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col overflow-y-auto p-2" style={{ maxHeight: "calc(45vh - 3rem)" }}>
                      {history.length === 0 && <p className="p-3 text-sm text-dim">Азырынча иштетүү жок.</p>}
                      {history.map((h) => (
                        <button key={h.id} onClick={() => { show(h.id); setTab("run"); }}
                          className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-raised ${run.executionId === h.id ? "bg-raised" : ""}`}>
                          <span className="flex items-center gap-3">
                            <StatusDot status={h.status} />
                            <span className="text-xs text-dim">{h.trigger}</span>
                          </span>
                          <span className="text-xs text-dim">{ago(h.created_at)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {sel && (
              <div className="absolute inset-y-0 right-0 z-20 w-full max-w-sm md:static md:w-[22rem] md:shrink-0">
                <ConfigPanel
                  key={sel.id}
                  nodeId={sel.id}
                  type={sel.type!}
                  data={sel.data}
                  spec={specs[sel.type!]}
                  upstream={upstream}
                  credentials={credentials}
                  webhookUrl={wf.webhook_url}
                  step={run.steps[sel.id]}
                  onChange={(d) => updateData(sel.id, d)}
                  onDelete={() => { setNodes((ns) => ns.filter((n) => n.id !== sel.id)); setEdges((es) => es.filter((e) => e.source !== sel.id && e.target !== sel.id)); setSelected(null); setDirty(true); }}
                  onClose={() => setSelected(null)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-1.5 text-xs text-dim">
            <span>{nodes.length} блок · {edges.length} байланыш{wf.schedule_next_at && wf.is_active ? ` · кийинки иштетүү: ${new Date(wf.schedule_next_at).toLocaleString("ky-KG")}` : ""}</span>
            <span className="flex gap-4">
              <button onClick={() => fitView({ padding: 0.3, duration: 300 })} className="hover:text-fg">Баарын көрсөтүү</button>
              <form action={deleteWorkflow.bind(null, wf.id)} onSubmit={(e) => { if (!confirm("Бул workflow биротоло өчүрүлөт. Уланталыбы?")) e.preventDefault(); }}>
                <button className="hover:text-bad">Workflow'ду өчүрүү</button>
              </form>
            </span>
          </div>
        </div>
      </StatusContext.Provider>
    </CatalogContext.Provider>
  );
}

export default function Editor(props: { workflow: Workflow; catalog: Catalog; credentials: Credential[]; wsBase: string }) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
