# Secret Audit Report — Olfactra

**Date:** 2026-03-06
**Auditor:** Manus AI
**Scope:** All source files in `/home/ubuntu/jaylabs-perfumery` excluding `node_modules/` and `.git/`

---

## Summary

The Olfactra codebase is **clean of hardcoded secrets**. All sensitive credentials are loaded from environment variables via the centralized `server/_core/env.ts` module. No API keys, database passwords, or tokens are embedded in source code.

However, there are **two items requiring remediation** before pushing to GitHub:

---

## Findings

### CRITICAL: `.manus/db/` query log files contain database connection details

| Detail | Value |
|---|---|
| **Files** | `.manus/db/db-query-*.json` (15 files) |
| **Content** | MySQL CLI commands with `--host`, `--user`, and `--database` values for TiDB Cloud |
| **Example** | `--host <REDACTED>.tidbcloud.com --user <REDACTED>.root --database <REDACTED>` |
| **Risk** | Exposes database hostname, username, and database name (no password found) |
| **Remediation** | Add `.manus/` to `.gitignore` and remove from git tracking |

### LOW: `client/public/__manus__/debug-collector.js` — Manus platform debug tool

| Detail | Value |
|---|---|
| **File** | `client/public/__manus__/debug-collector.js` |
| **Content** | Browser debug log collector (console, network, session replay) — Manus platform tooling |
| **Risk** | Not a secret, but platform-specific tooling that should not ship to production |
| **Remediation** | Add `client/public/__manus__/` to `.gitignore` and remove from git tracking |

---

## Clean Areas (No Issues Found)

| Area | Status | Notes |
|---|---|---|
| **API keys** | Clean | All loaded via `ENV.forgeApiKey` from `BUILT_IN_FORGE_API_KEY` env var |
| **Database URL** | Clean | Loaded via `process.env.DATABASE_URL` in `env.ts` and `drizzle.config.ts` |
| **Auth/JWT secret** | Clean | Loaded via `process.env.JWT_SECRET` as `ENV.cookieSecret` |
| **OAuth credentials** | Clean | Loaded via `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` env vars |
| **Storage credentials** | Clean | Uses `ENV.forgeApiUrl` and `ENV.forgeApiKey` (same Forge proxy) |
| **LLM/AI credentials** | Clean | Uses `ENV.forgeApiKey` via centralized `invokeLLM()` helper |
| **Frontend env vars** | Clean | Only `VITE_*` prefixed vars exposed (public by Vite convention): `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `VITE_FRONTEND_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`, `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` |
| **`.env` files** | Clean | No `.env` files exist in the project |
| **Git history** | Clean | No `.env` files ever committed |
| **`package.json` scripts** | Clean | No embedded secrets |
| **Hardcoded URLs** | Clean | Only public CDN URLs (Google Fonts, Forge proxy fallback) |
| **Session tokens** | Clean | Handled via cookies/localStorage with JWT signing from env var |

---

## Environment Variable Inventory

All secrets are loaded through `server/_core/env.ts`:

| Env Variable | Used By | Sensitivity |
|---|---|---|
| `DATABASE_URL` | `server/db.ts`, `drizzle.config.ts` | **Secret** — DB connection string |
| `JWT_SECRET` | `server/_core/sdk.ts` (cookie signing) | **Secret** — Session signing key |
| `BUILT_IN_FORGE_API_KEY` | LLM, storage, maps, notifications, voice, image gen | **Secret** — Server-side API key |
| `BUILT_IN_FORGE_API_URL` | All server-side API calls | Config — API base URL |
| `OAUTH_SERVER_URL` | `server/_core/oauth.ts` | Config — OAuth backend URL |
| `OWNER_OPEN_ID` | `server/_core/env.ts` | Config — Owner identification |
| `VITE_APP_ID` | Frontend OAuth login | Config — Public app identifier |
| `VITE_OAUTH_PORTAL_URL` | Frontend login redirect | Config — Public OAuth portal URL |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend Maps component | **Low-risk** — Frontend-scoped API key |
| `VITE_FRONTEND_FORGE_API_URL` | Frontend Maps component | Config — Frontend API URL |
| `VITE_ANALYTICS_ENDPOINT` | `client/index.html` (Umami) | Config — Analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | `client/index.html` (Umami) | Config — Analytics site ID |
| `VITE_APP_TITLE` | App title display | Config — Display name |
| `VITE_APP_LOGO` | App logo display | Config — Logo URL |
| `OWNER_NAME` | Owner display name | Config — Display name |
