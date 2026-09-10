"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import { createSession } from "@/lib/session";
import type { LoginState } from "./types";

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!username || !password) {
    return { status: "error", error: "יש להזין שם משתמש וסיסמה." };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  // Same generic message whether the username doesn't exist or the
  // password is wrong - don't tell an attacker which one failed.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { status: "error", error: "שם משתמש או סיסמה שגויים." };
  }

  await createSession({ userId: user.id, username: user.username, role: user.role });
  redirect(next.startsWith("/") ? next : "/");
}
