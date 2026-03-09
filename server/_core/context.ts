import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// TEMPORARY: Password Gate — authenticate via gate token when GATE_PASSWORD is set
async function authenticateViaGateToken(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  if (!ENV.gatePassword) return null; // Gate not enabled

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer gate_")) return null;

  const rawToken = authHeader.slice(7); // Remove "Bearer " → "gate_eyJhbG..."
  const jwtToken = rawToken.slice(5); // Remove "gate_" prefix → "eyJhbG..."
  const session = await sdk.verifySession(jwtToken);
  if (!session || session.appId !== "password_gate") return null;

  // Look up or create the owner user
  let user = await db.getUserByOpenId(session.openId);
  if (!user) {
    await db.upsertUser({
      openId: session.openId,
      name: session.name || "Gate User",
      lastSignedIn: new Date(),
    });
    user = await db.getUserByOpenId(session.openId);
  }
  return user ?? null;
}
// END TEMPORARY: Password Gate

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // TEMPORARY: Password Gate — try gate token first when GATE_PASSWORD is set
  if (ENV.gatePassword) {
    user = await authenticateViaGateToken(opts.req);
  }
  // END TEMPORARY: Password Gate

  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
