import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Parse the state parameter from the OAuth callback.
 * State can be either:
 *  - A JSON object (base64-encoded) with { redirectUri, origin, returnPath }
 *  - A plain base64-encoded redirectUri string (legacy)
 */
function parseState(state: string): { redirectUri: string; origin: string; returnPath: string } {
  try {
    const decoded = atob(state);
    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === "object" && parsed.origin) {
        return {
          redirectUri: parsed.redirectUri || decoded,
          origin: parsed.origin,
          returnPath: parsed.returnPath || "/",
        };
      }
    } catch {
      // Not JSON, treat as plain redirectUri
    }
    // Legacy: state is just base64(redirectUri), extract origin from it
    const url = new URL(decoded);
    return {
      redirectUri: decoded,
      origin: url.origin,
      returnPath: "/",
    };
  } catch {
    return {
      redirectUri: "",
      origin: "",
      returnPath: "/",
    };
  }
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Parse state to get the frontend origin and redirect there
      const { origin, returnPath } = parseState(state);
      const redirectUrl = origin ? `${origin}${returnPath}` : returnPath || "/";

      console.log(`[OAuth] Callback success, redirecting to: ${redirectUrl}`);
      res.redirect(302, redirectUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
