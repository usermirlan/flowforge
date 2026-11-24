"use client";

import { createContext, useContext } from "react";
import type { NodeSpec, Step } from "@/lib/types";

export const StatusContext = createContext<Record<string, Step>>({});
export const CatalogContext = createContext<Record<string, NodeSpec>>({});

export const useNodeStatus = (id: string) => useContext(StatusContext)[id];
export const useSpec = (type: string) => useContext(CatalogContext)[type];

const SHORT: Record<string, string> = {
  "trigger.manual": "manual",
  "trigger.webhook": "webhook",
  "trigger.schedule": "schedule",
  "http.request": "http",
  "logic.if": "if",
  "data.set": "set",
  "telegram.send": "telegram",
  "ai.prompt": "ai",
};

/** Readable ids so templates read like {{ nodes.http_1.body }}. */
export function nextNodeId(type: string, taken: Set<string>): string {
  const base = SHORT[type] ?? type.split(".").at(-1)!.replace(/[^a-z0-9]/gi, "");
  let i = 1;
  while (taken.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

export function defaultParams(spec: NodeSpec): Record<string, unknown> {
  return Object.fromEntries(spec.params.map((p) => [p.name, structuredClone(p.default ?? (p.kind === "bool" ? false : ""))]));
}
