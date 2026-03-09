/**
 * TEMPORARY: Password Gate Tests
 * Remove this entire file when Manus OAuth redirect domain is whitelisted.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("gate.check", () => {
  it("returns enabled: true when GATE_PASSWORD is set", async () => {
    // GATE_PASSWORD is set via webdev_request_secrets (test_gate_2024)
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.gate.check();
    expect(result).toEqual({ enabled: true });
  });
});

describe("gate.verify", () => {
  it("returns success and a token for the correct password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.gate.verify({ password: "test_gate_2024" });

    expect(result.success).toBe(true);
    expect("token" in result && result.token).toBeTruthy();
    // Token should start with gate_ prefix
    if ("token" in result) {
      expect(result.token.startsWith("gate_")).toBe(true);
    }
  });

  it("returns failure for an incorrect password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.gate.verify({ password: "wrong_password" });

    expect(result.success).toBe(false);
    expect("error" in result && result.error).toBe("Incorrect password");
  });

  it("returns failure for an empty password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.gate.verify({ password: "" });

    expect(result.success).toBe(false);
    expect("error" in result && result.error).toBe("Incorrect password");
  });

  it("returns a JWT token that can be decoded", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.gate.verify({ password: "test_gate_2024" });

    expect(result.success).toBe(true);
    if ("token" in result) {
      // Remove gate_ prefix and check it's a valid JWT (3 dot-separated base64 parts)
      const jwt = result.token.replace("gate_", "");
      const parts = jwt.split(".");
      expect(parts).toHaveLength(3);
    }
  });
});
