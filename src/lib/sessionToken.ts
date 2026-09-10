// Pure JWT sign/verify, deliberately split out from session.ts (which adds
// "server-only" and next/headers cookie plumbing on top) so this half -
// the actual security-relevant logic - is unit-testable without a Next.js
// request context.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "arnona_session";

export interface SessionPayload {
  userId: string;
  username: string;
  role: "ADMIN" | "MEMBER";
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Copy .env.example to .env and configure it.");
  }
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function decryptSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || typeof payload.username !== "string") return null;
    if (payload.role !== "ADMIN" && payload.role !== "MEMBER") return null;
    return { userId: payload.userId, username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}
