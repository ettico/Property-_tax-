import type { BrowserContext } from "@playwright/test";
import { encryptSession, SESSION_COOKIE } from "../src/lib/sessionToken";

/**
 * Forges a valid session cookie the same way login would, without going
 * through the DB-backed login form. The Server Actions under test
 * (/upload) never touch Prisma themselves - only /login and /users do -
 * so this is enough to exercise the real app with zero database
 * dependency, which matters here since these e2e specs don't have one.
 */
export async function signInAs(
  context: BrowserContext,
  baseURL: string,
  role: "ADMIN" | "MEMBER" = "MEMBER",
): Promise<void> {
  const token = await encryptSession({ userId: "e2e-test-user", username: "בודק אוטומטי", role });
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: token,
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
