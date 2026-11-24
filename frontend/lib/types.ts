export type ParamSpec = {
  name: string;
  label: string;
  kind: "text" | "textarea" | "select" | "json" | "bool" | "fields";
  default?: unknown;
  options?: string[];
  help?: string;
};

export type NodeSpec = {
  type: string;
  label: string;
  group: "trigger" | "action" | "logic" | "data" | "ai";
  description: string;
  params: ParamSpec[];
  handles?: string[];
  credential?: string;
  credential_optional?: boolean;
};

export type CredentialType = {
  label: string;
  fields: { name: string; label: string; secret: boolean; default?: string }[];
};

export type Catalog = { nodes: NodeSpec[]; credential_types: Record<string, CredentialType> };

export type FlowNodeData = {
  label: string;
  params: Record<string, unknown>;
  credentialId?: number | null;
  continueOnError?: boolean;
};

export type GraphNode = { id: string; type: string; position: { x: number; y: number }; data: FlowNodeData };
export type GraphEdge = { id: string; source: string; target: string; sourceHandle?: string | null };
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

export type Workflow = {
  id: string;
  name: string;
  description: string;
  graph: Graph;
  is_active: boolean;
  webhook_url: string;
  schedule_cron: string | null;
  schedule_next_at: string | null;
  problems: string[];
  updated_at: string;
};

export type WorkflowSummary = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_type: string | null;
  last_status: string | null;
  last_run_at: string | null;
  updated_at: string;
};

export type Step = {
  node_id: string;
  node_type?: string;
  status: "running" | "success" | "error" | "skipped";
  output?: unknown;
  error?: string | null;
  duration_ms?: number;
};

export type Execution = {
  id: string;
  workflow_id: string;
  status: "queued" | "running" | "success" | "error";
  trigger: string;
  input: Record<string, unknown>;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type ExecutionDetail = Execution & { steps: Step[]; graph: Graph };

export type Credential = { id: number; name: string; type: string; preview: Record<string, string>; created_at: string };

export type User = { id: number; email: string; name: string };
