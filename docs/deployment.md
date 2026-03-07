# Olfactra — Deployment Guide

This document covers the steps required to publish Olfactra to a private GitHub repository and deploy it via Cloudflare (or any Node.js-compatible hosting platform). It assumes you have already completed the security audit and that no secrets are stored in the codebase.

---

## Prerequisites

Before proceeding, confirm the following:

- Node.js 22+ and pnpm are installed locally.
- You have a GitHub account with permission to create private repositories.
- You have a Cloudflare account (if deploying to Cloudflare Pages or Workers).
- You have access to all required environment variable values (see the table below).

---

## Environment Variables

Olfactra requires the following environment variables at runtime. None of these are stored in the codebase — they must be configured in your hosting platform's environment settings.

### Server-Side Variables (Secret)

These variables must **never** be exposed to the browser. They are used exclusively by the Node.js server.

| Variable | Purpose | Example Format |
|---|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string for Drizzle ORM | `mysql://user:pass@host:port/dbname?ssl={"rejectUnauthorized":true}` |
| `JWT_SECRET` | Signing key for session cookies (JWT) | Any random 64+ character string |
| `BUILT_IN_FORGE_API_KEY` | Bearer token for Manus Forge API (AI, storage, maps, notifications) | `sk-...` or platform-issued token |
| `BUILT_IN_FORGE_API_URL` | Base URL for the Manus Forge API server | `https://forge.example.com` |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL for token exchange | `https://api.manus.im` |
| `OWNER_OPEN_ID` | Owner's Manus OpenID for admin identification | `user-abc123` |
| `OWNER_NAME` | Owner's display name | `Jay McGowan` |

### Client-Side Variables (Public)

These variables are prefixed with `VITE_` and are embedded into the frontend bundle at build time. They are safe to expose in the browser.

| Variable | Purpose | Example Format |
|---|---|---|
| `VITE_APP_ID` | Manus OAuth application ID | `app-xyz789` |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL (frontend redirect) | `https://login.manus.im` |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend-scoped Forge API key (limited permissions) | Platform-issued token |
| `VITE_FRONTEND_FORGE_API_URL` | Frontend Forge API base URL | `https://forge.example.com` |
| `VITE_ANALYTICS_ENDPOINT` | Umami analytics script endpoint | `https://analytics.example.com` |
| `VITE_ANALYTICS_WEBSITE_ID` | Umami website tracking ID | `uuid-string` |
| `VITE_APP_TITLE` | Application display title | `Olfactra` |
| `VITE_APP_LOGO` | Application logo URL | `https://cdn.example.com/logo.svg` |

---

## GitHub Prep Checklist

Complete these steps before pushing to GitHub:

1. **Verify `.gitignore` coverage.** Confirm that `.env`, `.env.*`, `.manus/`, `.manus-logs/`, `client/public/__manus__/`, and `.webdev/` are all listed in `.gitignore`. The file `.env.example` (or `docs/env-example.txt`) should **not** be ignored.

2. **Confirm no secrets in tracked files.** Run the following command from the project root to verify:
   ```bash
   git ls-files | xargs grep -lE '(sk-[a-zA-Z0-9]{10,}|password=|mysql://[a-z])' 2>/dev/null
   ```
   This should return no results.

3. **Remove Manus platform files from git index.** If not already done:
   ```bash
   git rm -r --cached .manus/ 2>/dev/null
   git rm -r --cached client/public/__manus__/ 2>/dev/null
   ```

4. **Create the GitHub repository.** Use the GitHub CLI or web interface to create a **private** repository:
   ```bash
   gh repo create olfactra --private --source=. --push
   ```
   Alternatively, use the Manus Management UI's GitHub export feature (Settings > GitHub).

5. **Verify the push.** After pushing, browse the repository on GitHub and confirm that no `.env` files, `.manus/` directories, or debug collectors appear in the file tree.

---

## Local Development Setup

To run Olfactra locally after cloning from GitHub:

1. **Clone the repository:**
   ```bash
   git clone git@github.com:YOUR_USERNAME/olfactra.git
   cd olfactra
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Create your `.env` file.** Copy the template and fill in your values:
   ```bash
   cp docs/env-example.txt .env
   # Edit .env with your actual values
   ```

4. **Push the database schema** (if starting fresh):
   ```bash
   pnpm db:push
   ```

5. **Start the development server:**
   ```bash
   pnpm dev
   ```
   The app will be available at `http://localhost:3000`.

---

## Cloudflare Deployment

### Option A: Cloudflare Pages (Static + Functions)

Cloudflare Pages can host the Vite-built frontend. However, Olfactra requires a Node.js server for tRPC, OAuth, and database access. If using Cloudflare Pages, you will need a separate backend deployment (e.g., Cloudflare Workers or a standalone Node.js host).

### Option B: Cloudflare Workers (Full-Stack)

For full-stack deployment on Cloudflare Workers, you would need to adapt the Express server to the Workers runtime. This requires additional configuration beyond the current setup.

### Option C: Any Node.js Host (Recommended)

Olfactra is a standard Node.js application. The simplest deployment path is any platform that supports Node.js 22+:

1. **Build the application:**
   ```bash
   pnpm build
   ```
   This produces `dist/public/` (frontend) and `dist/index.js` (server).

2. **Set environment variables** in your hosting platform's dashboard. Add every variable from the tables above.

3. **Start the production server:**
   ```bash
   pnpm start
   ```
   The server serves both the API and the static frontend from a single process.

### Cloudflare Environment Variable Setup

If deploying to Cloudflare (Pages or Workers), set environment variables in the Cloudflare dashboard:

1. Navigate to your project in the Cloudflare dashboard.
2. Go to **Settings > Environment Variables**.
3. Add each variable from the tables above.
4. For sensitive values (`DATABASE_URL`, `JWT_SECRET`, `BUILT_IN_FORGE_API_KEY`), use the **Encrypt** option.
5. Ensure `VITE_*` variables are set for the **build** environment (they are embedded at build time).
6. Non-`VITE_` variables should be set for the **runtime** environment.

---

## Database Notes

Olfactra uses MySQL (TiDB Cloud) via Drizzle ORM. The `DATABASE_URL` connection string should include SSL configuration for production:

```
mysql://user:password@host:port/database?ssl={"rejectUnauthorized":true}
```

To apply schema changes after deployment:
```bash
DATABASE_URL="your-connection-string" pnpm db:push
```

---

## Build Verification

Before deploying, verify the build succeeds locally:

```bash
pnpm check    # TypeScript type checking
pnpm test     # Run test suite
pnpm build    # Production build
```

All three commands should complete without errors.
