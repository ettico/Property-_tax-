import { beforeEach, describe, expect, it, vi } from "vitest";

// AUTH_SECRET is read lazily inside encrypt/decrypt, so setting it before
// each test (rather than once at module load) is enough - no need to
// reset modules between tests.
beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "unit-test-secret-do-not-use-in-real-deploys");
});

describe("session encrypt/decrypt", () => {
  it("round-trips a payload through a real signed token", async () => {
    const { encryptSession, decryptSession } = await import("../sessionToken");
    const token = await encryptSession({ userId: "u1", username: "דנה", role: "ADMIN" });
    const decoded = await decryptSession(token);
    expect(decoded).toEqual({ userId: "u1", username: "דנה", role: "ADMIN" });
  });

  it("rejects a token signed with a different secret", async () => {
    const { encryptSession } = await import("../sessionToken");
    const token = await encryptSession({ userId: "u1", username: "דנה", role: "ADMIN" });

    vi.stubEnv("AUTH_SECRET", "a-completely-different-secret");
    vi.resetModules();
    const { decryptSession } = await import("../sessionToken");
    expect(await decryptSession(token)).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const { encryptSession, decryptSession } = await import("../sessionToken");
    const token = await encryptSession({ userId: "u1", username: "דנה", role: "MEMBER" });
    const tampered = token.slice(0, -4) + "abcd";
    expect(await decryptSession(tampered)).toBeNull();
  });

  it("rejects undefined/empty input instead of throwing", async () => {
    const { decryptSession } = await import("../sessionToken");
    expect(await decryptSession(undefined)).toBeNull();
  });

  it("rejects a well-formed JWT for a different payload shape (e.g. missing role)", async () => {
    const { SignJWT } = await import("jose");
    const key = new TextEncoder().encode("unit-test-secret-do-not-use-in-real-deploys");
    const token = await new SignJWT({ userId: "u1", username: "x" }) // no role
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(key);

    const { decryptSession } = await import("../sessionToken");
    expect(await decryptSession(token)).toBeNull();
  });
});
