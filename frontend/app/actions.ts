"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import { getToken, TOKEN_COOKIE } from "@/lib/session";
import type { Credential, Execution, ExecutionDetail, Graph, User, Workflow } from "@/lib/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof ApiError ? e.message : "Сервер жеткиликсиз, кийинчерээк аракет кылыңыз" };
}

async function token(): Promise<string> {
  const t = await getToken();
  if (!t) redirect("/login");
  return t;
}

// ---- auth -----------------------------------------------------------------

export async function authenticate(_: unknown, form: FormData): Promise<{ error?: string }> {
  const mode = form.get("mode") === "register" ? "register" : "login";
  const body: Record<string, string> = {
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  };
  if (mode === "register") body.name = String(form.get("name") ?? "");
  let res: { token: string; user: User };
  try {
    res = await api(`/api/auth/${mode}`, { method: "POST", body });
  } catch (e) {
    return { error: fail(e).error };
  }
  (await cookies()).set(TOKEN_COOKIE, res.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  const next = String(form.get("next") || "/workflows");
  redirect(next.startsWith("/") ? next : "/workflows");
}

export async function logout() {
  (await cookies()).delete(TOKEN_COOKIE);
  redirect("/");
}

// ---- workflows ------------------------------------------------------------

export async function createWorkflow(name: string, graph?: Graph, description = ""): Promise<Result<Workflow>> {
  try {
    const wf = await api<Workflow>("/api/workflows", { method: "POST", token: await token(), body: { name, graph, description } });
    revalidatePath("/workflows");
    return { ok: true, data: wf };
  } catch (e) {
    return fail(e);
  }
}

export async function saveWorkflow(id: string, name: string, description: string, graph: Graph): Promise<Result<Workflow>> {
  try {
    const wf = await api<Workflow>(`/api/workflows/${id}`, { method: "PUT", token: await token(), body: { name, description, graph } });
    revalidatePath("/workflows");
    return { ok: true, data: wf };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteWorkflow(id: string) {
  await api(`/api/workflows/${id}`, { method: "DELETE", token: await token() });
  revalidatePath("/workflows");
  redirect("/workflows");
}

export async function setActive(id: string, active: boolean): Promise<Result<Workflow>> {
  try {
    const wf = await api<Workflow>(`/api/workflows/${id}/activate`, { method: "POST", token: await token(), body: { active } });
    revalidatePath("/workflows");
    return { ok: true, data: wf };
  } catch (e) {
    return fail(e);
  }
}

export async function runWorkflow(id: string, payload: Record<string, unknown>): Promise<Result<{ execution: Execution; ticket: string }>> {
  try {
    const t = await token();
    const execution = await api<Execution>(`/api/workflows/${id}/run`, { method: "POST", token: t, body: { payload } });
    const { ticket } = await api<{ ticket: string }>(`/api/executions/${execution.id}/ticket`, { method: "POST", token: t });
    return { ok: true, data: { execution, ticket } };
  } catch (e) {
    return fail(e);
  }
}

export async function listExecutions(workflowId: string): Promise<Execution[]> {
  try {
    return await api<Execution[]>(`/api/workflows/${workflowId}/executions`, { token: await token() });
  } catch {
    return [];
  }
}

export async function getExecution(id: string): Promise<Result<ExecutionDetail>> {
  try {
    return { ok: true, data: await api<ExecutionDetail>(`/api/executions/${id}`, { token: await token() }) };
  } catch (e) {
    return fail(e);
  }
}

// ---- credentials ----------------------------------------------------------

export async function createCredential(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const type = String(form.get("type") ?? "");
  const data: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (k.startsWith("field_")) data[k.slice(6)] = String(v);
  try {
    await api<Credential>("/api/credentials", { method: "POST", token: await token(), body: { name: form.get("name"), type, data } });
  } catch (e) {
    return { error: fail(e).error };
  }
  revalidatePath("/credentials");
  return { ok: true };
}

export async function deleteCredential(id: number) {
  await api(`/api/credentials/${id}`, { method: "DELETE", token: await token() });
  revalidatePath("/credentials");
}
