import { notFound } from "next/navigation";
import Editor from "@/components/editor/Editor";
import { api, ApiError } from "@/lib/api";
import { requireToken } from "@/lib/session";
import type { Catalog, Credential, Workflow } from "@/lib/types";

export const metadata = { title: "Редактор — FlowForge" };

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await requireToken(`/workflows/${id}`);
  let workflow: Workflow;
  try {
    workflow = await api<Workflow>(`/api/workflows/${id}`, { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const [catalog, credentials] = await Promise.all([
    api<Catalog>("/api/nodes"),
    api<Credential[]>("/api/credentials", { token }),
  ]);
  // Browser-facing API origin for the live-status WebSocket (read at runtime, not build time)
  const wsBase = process.env.PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:8000";
  return <Editor workflow={workflow} catalog={catalog} credentials={credentials} wsBase={wsBase} />;
}
