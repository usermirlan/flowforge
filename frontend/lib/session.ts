import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { api } from "./api";
import type { User } from "./types";

export const TOKEN_COOKIE = "ff_token";

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN_COOKIE)?.value ?? null;
}

export const getUser = cache(async (): Promise<User | null> => {
  const token = await getToken();
  if (!token) return null;
  try {
    return await api<User>("/api/auth/me", { token });
  } catch {
    return null;
  }
});

/** Token for a page that requires login; redirects to /login otherwise. */
export async function requireToken(next = "/workflows"): Promise<string> {
  const token = await getToken();
  if (!token || !(await getUser())) redirect(`/login?next=${encodeURIComponent(next)}`);
  return token;
}
