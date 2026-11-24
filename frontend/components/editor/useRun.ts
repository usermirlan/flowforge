"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getExecution, runWorkflow } from "@/app/actions";
import type { Execution, Step } from "@/lib/types";

type RunState = {
  executionId: string | null;
  status: Execution["status"] | null;
  error: string | null;
  steps: Record<string, Step>;
};

const EMPTY: RunState = { executionId: null, status: null, error: null, steps: {} };
const FINISHED = new Set(["success", "error"]);

/** Starts a run and follows it over WebSocket, falling back to polling. */
export function useRun(workflowId: string, wsBase: string) {
  const [run, setRun] = useState<RunState>(EMPTY);
  const ws = useRef<WebSocket | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    ws.current?.close();
    ws.current = null;
    if (poll.current) clearInterval(poll.current);
    poll.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  const load = useCallback(async (id: string) => {
    const r = await getExecution(id);
    if (!r.ok) return false;
    const d = r.data;
    setRun({ executionId: d.id, status: d.status, error: d.error, steps: Object.fromEntries(d.steps.map((s) => [s.node_id, s])) });
    return FINISHED.has(d.status);
  }, []);

  const startPolling = useCallback((id: string) => {
    if (poll.current) return;
    poll.current = setInterval(async () => {
      if (await load(id)) stop();
    }, 1000);
  }, [load, stop]);

  const start = useCallback(async (payload: Record<string, unknown>): Promise<string | null> => {
    stop();
    setRun({ ...EMPTY, status: "queued" });
    const r = await runWorkflow(workflowId, payload);
    if (!r.ok) {
      setRun({ ...EMPTY, status: "error", error: r.error });
      return r.error;
    }
    const id = r.data.execution.id;
    setRun((s) => ({ ...s, executionId: id }));
    let opened = false;
    try {
      const sock = new WebSocket(`${wsBase.replace(/^http/, "ws")}/api/executions/${id}/ws?ticket=${encodeURIComponent(r.data.ticket)}`);
      ws.current = sock;
      sock.onopen = () => { opened = true; };
      sock.onmessage = (m) => {
        const ev = JSON.parse(m.data);
        if (ev.type === "snapshot") {
          setRun({ executionId: id, status: ev.status, error: ev.error, steps: Object.fromEntries(ev.steps.map((s: Step) => [s.node_id, s])) });
        } else if (ev.type === "step") {
          setRun((s) => ({ ...s, steps: { ...s.steps, [ev.node_id]: { ...s.steps[ev.node_id], ...ev } } }));
        } else if (ev.type === "execution") {
          setRun((s) => ({ ...s, status: ev.status, error: ev.error ?? s.error }));
        }
      };
      // socket refused or dropped before the end: fall back to polling the API
      sock.onclose = () => {
        ws.current = null;
        setRun((s) => {
          if (!s.status || !FINISHED.has(s.status)) startPolling(id);
          return s;
        });
      };
      sock.onerror = () => { if (!opened) startPolling(id); };
    } catch {
      startPolling(id);
    }
    return null;
  }, [workflowId, wsBase, stop, startPolling]);

  const show = useCallback(async (id: string) => { stop(); await load(id); }, [load, stop]);
  const clear = useCallback(() => { stop(); setRun(EMPTY); }, [stop]);

  return { run, start, show, clear };
}
