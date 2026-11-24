import type { NodeSpec } from "./types";

export const GROUP_COLOR: Record<NodeSpec["group"], string> = {
  trigger: "var(--color-trigger)",
  action: "var(--color-action)",
  logic: "var(--color-logic)",
  data: "var(--color-data)",
  ai: "var(--color-ai)",
};

export const GROUP_ORDER: NodeSpec["group"][] = ["trigger", "action", "logic", "data", "ai"];

export const TYPE_ICON: Record<string, string> = {
  "trigger.manual": "▶",
  "trigger.webhook": "⚡",
  "trigger.schedule": "⏰",
  "http.request": "🌐",
  "logic.if": "⑂",
  "data.set": "{ }",
  "telegram.send": "✈",
  "ai.prompt": "✦",
};

export function groupOf(type: string): NodeSpec["group"] {
  if (type.startsWith("trigger.")) return "trigger";
  if (type.startsWith("logic.")) return "logic";
  if (type.startsWith("data.")) return "data";
  if (type.startsWith("ai.")) return "ai";
  return "action";
}
