import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

/**
 * The one place that decides "is there a logged-in user". Every page,
 * Server Action, and Route Handler that needs auth calls this (or
 * requireAdmin below) instead of reading the cookie directly - so there is
 * a single spot to get the check right. proxy.ts also checks the cookie,
 * but only optimistically (to redirect fast, no DB); this is the real
 * check close to the data.
 */
export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await verifySession();
  if (session.role !== "ADMIN") {
    redirect("/");
  }
  return session;
}
