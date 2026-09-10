"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import type { CreateUserState } from "./types";

export async function createUser(_prevState: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const admin = await requireAdmin();

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";

  if (username.length < 3) {
    return { status: "error", error: "שם משתמש חייב להיות באורך 3 תווים לפחות." };
  }
  if (password.length < 8) {
    return { status: "error", error: "סיסמה חייבת להיות באורך 8 תווים לפחות." };
  }

  try {
    await prisma.user.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
        role,
        createdById: admin.userId,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { status: "error", error: `שם המשתמש "${username}" כבר תפוס.` };
    }
    throw err;
  }

  revalidatePath("/users");
  return { status: "success" };
}

export async function deleteUser(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (userId === admin.userId) {
    throw new Error("אי אפשר למחוק את המשתמש שאיתו מחוברים כרגע.");
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/users");
}
