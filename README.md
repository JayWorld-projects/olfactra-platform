# Olfactra

**A professional perfumery studio for fragrance formulation, ingredient management, and accord building.**

Olfactra is a full-stack web application designed for perfumers and fragrance enthusiasts. It provides tools for managing raw material libraries, building and analyzing fragrance formulas, generating AI-powered accords, and importing formulas from external sources.

## Features

**Ingredient Library** — Catalog of 280+ raw materials with categories, scent profiles, IFRA safety data, CAS numbers, dilution tracking, and AI-generated tasting notes.

**Formula Builder** — Create, edit, and analyze fragrance formulas with real-time weight calculations, dilution percentages, neat/as-dosed toggling, normalization, and auto-save snapshots.

**Accord Builder** — AI-powered accord generation from descriptive prompts, with inline ingredient editing, percentage normalization, ingredient swapping, and send-to-formula integration.

**Scent Lab** — Describe a fragrance concept in natural language and receive AI-generated formula suggestions filtered to your library.

**Formula Import** — Multi-step import wizard supporting paste text, CSV upload, and PDF upload with AI-powered parsing, library matching, and substitution suggestions.

**Derived Products** — Generate product versions (EDP, EDT, Body Spray, Body Oil, Room Spray, Reed Diffuser, Scented Lotion) with batch sizing, fragrance load control, and AI-generated mixing procedures.

**Formula Comparison** — Side-by-side comparison of formulas with ingredient overlap analysis and visual comparison bars.

**Category Manager** — Create, rename, color-assign, and delete ingredient categories with auto-seeding from existing data.

**Workspaces** — Organize formulas into named workspaces for project-based workflow management.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui |
| Backend | Express 4, tRPC 11 |
| Database | TiDB Cloud (MySQL-compatible) via Drizzle ORM |
| Auth | Manus OAuth |
| AI | LLM integration for notes, accords, scent lab, and import parsing |
| Storage | S3 for file uploads |
| Language | TypeScript end-to-end |

## Project Structure

```
client/src/pages/       — Page-level components (Home, Library, FormulaBuilder, etc.)
client/src/components/  — Reusable UI components (shadcn/ui + custom)
server/routers.ts       — tRPC procedures (all API endpoints)
server/db.ts            — Database query helpers
drizzle/schema.ts       — Database schema definitions
docs/                   — Deployment and security documentation
```

## Environment Variables

All configuration is managed through environment variables. See `docs/env-example.txt` for the complete list of required variables with descriptions.

**Key variables:**

- `DATABASE_URL` — MySQL/TiDB connection string
- `JWT_SECRET` — Session cookie signing secret
- `BUILT_IN_FORGE_API_KEY` — LLM and storage API authentication
- `VITE_APP_ID` — OAuth application ID

See `docs/deployment.md` for full setup instructions.

## Development

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Start development server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm check

# Production build
pnpm build
```

## Testing

The project includes 89 tests across 8 test files covering:

- Authentication and session management
- Ingredient CRUD operations
- Formula creation, editing, and analysis
- AI notes generation
- Category management
- Accord generation, editing, and swap suggestions
- Formula import and matching

Run the full suite with `pnpm test`.

## Documentation

- `docs/deployment.md` — GitHub preparation and Cloudflare deployment checklists
- `docs/secret-audit-report.md` — Security audit findings and remediation status
- `docs/env-example.txt` — Complete environment variable reference

## License

Private. All rights reserved.
// redeploy 
// redeploy 
// redeploy 
