# Project Context

- **Owner:** Ben Leane
- **Project:** create-azure-app — a `create-t3-app`-style interactive CLI that scaffolds AZD-compatible full-stack Azure projects (SWA + Functions + PostgreSQL + Entra ID)
- **Stack:** TypeScript, Node.js, clack (CLI prompts), Azure Static Web Apps, Azure Functions v4, PostgreSQL Flexible Server, Entra ID, Prisma/Drizzle, Bicep, Docker Compose, SWA CLI
- **Created:** 2026-05-04

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-05-08: Fix #9 — .env.example uses placeholders instead of real defaults
- `src/features/env.ts`: `buildEnvExampleContent()` now uses generic placeholders (`USER:PASSWORD@localhost:5432/DBNAME`) instead of copying Docker defaults from `buildEnvContent()`
- Comment changed from "local Docker Compose defaults" to "Database" — example file shouldn't assume Docker
- `.env` still has real Docker defaults for local dev; `.env.example` is safe to commit

### 2026-05-04: Phase 2 Feature Module Pattern
- Feature functions: `xxxFeature(config: ProjectConfig): Feature` — import types from `../composer.js` and `../index.js`
- Sub-project deps go in FileEntry content (their own `package.json`), NOT on `Feature.dependencies`
- `Feature.scripts` is for root-level orchestration commands (e.g., `dev:web`, `build:api`)
- `JSON.stringify(obj, null, 2) + '\n'` for all JSON file content — matches base.ts pattern
- Template literals with `${projectName}` interpolation for dynamic content in generated files
- Next.js needs `module.exports` in `next.config.js` (CJS config, no `"type": "module"` in its package.json)
- Vite, SvelteKit, and API all use `"type": "module"` for ESM
- Azure Functions v4: `app.http('name', { methods, route, authLevel, handler })` — each function gets its own file
- SvelteKit for SWA: `adapter-static` with `fallback: 'index.html'` enables SPA client-side routing
- Svelte 5 layout uses `let { children } = $props()` + `{@render children()}`
- All four modules typecheck clean against the existing codebase

### 2026-05-04: Feature module pattern
- Features are functions returning `Feature` objects (from `../composer.js`) — string literals for all generated files, not executable code
- `compose()` merges features with last-write-wins on file paths, merged deps/scripts
- DB client stable path: `src/api/src/lib/db.ts` — same import for both Prisma and Drizzle
- Auth helper stable path: `src/api/src/lib/auth.ts` — parses `x-ms-client-principal` header
- SWA config at root `staticwebapp.config.json` — guards `/api/*` routes, login/logout redirects
- Prisma uses upserts in seed for idempotency; Drizzle uses `onConflictDoNothing()`
- Framework auth hooks: Next.js has both client hook + SSR API route; Vite+React is client-only hook; SvelteKit uses `hooks.server.ts` + `$lib/auth.ts`
- No extra dependencies for auth — it's all header parsing, no SDK

### 2026-05-04: Cross-agent — Tank's local dev modules
- Tank created `docker.ts` (Postgres 16-alpine, healthcheck), `swa-config.ts` (framework-aware proxy), `env.ts` (`.env`/`.env.example` + setup/dev scripts)
- `env.ts` owns `setup` and `dev` scripts — integrates docker compose, SWA CLI, and migration tooling
- SWA CLI proxy on :4280; Next.js on :3000; Vite/SvelteKit on :5173
- DevDeps added by env: `@azure/static-web-apps-cli`, `azure-functions-core-tools`

### 2026-05-04: Cross-agent — Neo's template bug fixes (6 items)
- Neo fixed bugs in files Trinity originally created: `swa-config.ts`, `api.ts`, `env.ts`
- Key lessons: SWA CLI `run` commands should NOT use `--prefix`; `apiDevserverUrl`/`apiDevserverCommand` should not be set (SWA auto-starts func from `apiLocation`); `local.settings.json` must be generated; avoid double-builds via `prestart` + `start`
- `dotenv` added as root dep via `envFeature`; `build:api` added to setup script
