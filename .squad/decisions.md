# Squad Decisions

## Active Decisions

### 2026-05-04: Phase 1 Architecture — Co-located Modules
**By:** Morpheus (Lead) | **Requested by:** Ben Leane
- Co-located feature modules in `src/modules/{name}/` — each has `index.ts` + `templates/`.
- `FeatureModule` interface: `enabled()`, `files()`, `dependencies()`, `scripts()`, `configContributions()`, `templateVars()`, `afterGenerate()`. Order field controls execution.
- Hybrid composition: static file copy, `{{var}}` interpolation, programmatic assembly for `package.json` and shared configs (deep-merge). No template engine.

### 2026-05-04: Phase 1 Architecture — Single Package, Minimal Deps
**By:** Morpheus (Lead) | **Requested by:** Ben Leane
- Single npm package `create-azure-app` (not monorepo). ESM, Node 20+, bin entry. Build with tsup.
- Runtime deps (2): `@clack/prompts`, `picocolors`.
- Dev deps (4): `tsup`, `typescript`, `vitest`, `@types/node`.
- Rejected: EJS/Handlebars, fs-extra, chalk, commander/yargs, execa.

### 2026-05-04: CLI Init — Build & Module System
**By:** Neo (CLI Dev) | **Requested by:** Ben Leane
- Build chain: tsup (build) + tsx (dev) + tsc (typecheck). ESM with Node16 module resolution.
- @clack/prompts v0.10 for interactive CLI. `picocolors` for coloring.
- Framework values: `'nextjs' | 'vite-react' | 'sveltekit'`. Auth field: `includeAuth: boolean`.
- Composer exports: `Feature`, `FileEntry`, `compose()`, `writeProject()`. Last-write-wins on file paths, merged deps.

### 2026-05-04: Test Infrastructure — Vitest with todo() Contracts
**By:** Mouse (Tester)
- Vitest with globals, node environment, 30s timeout.
- 46 test cases across 3 files, all `describe.todo()` — skipped until implementation exists.
- Tests document expected API shapes: `ProjectConfig`, `FeatureModule`, `ComposerResult`.
- ⚠️ Known misalignments with implementation: tests use `'vite'` (impl: `'vite-react'`), tests use `auth` (impl: `includeAuth`). Needs alignment.

### 2026-05-04: Phase 2 Template Decisions — Frontend & API Features
**By:** Trinity (Full-Stack Dev) | **Requested by:** Ben Leane
- Next.js `^15.3.0`, React `^19.1.0`; Vite `^6.3.0`; Svelte `^5.0.0`, SvelteKit `^2.15.0`; Azure Functions `@azure/functions` `^4.6.0`; TypeScript `^5.8.0` across all sub-projects.
- SWA deploy: Next.js uses `output: 'standalone'`; SvelteKit uses `adapter-static` with `fallback: 'index.html'`; Vite builds to `dist/` (SWA-native).
- Azure Functions v4 `app.http()` pattern (not v3 function.json). ESM with extension bundle `[4.*, 5.0.0)`.
- Sub-project deps baked into their own `package.json` FileEntry; `Feature.scripts` provides root orchestration commands.
- Items CRUD: in-memory array placeholder for DB feature module to replace.

### 2026-05-04: Database Feature Module — Prisma/Drizzle Pattern
**By:** Trinity (Full-Stack Dev) | **Requested by:** Ben Leane
- `databaseFeature(config)` returns a `Feature` with ORM-specific files, deps, and scripts based on `config.orm`.
- Both ORMs generate identical `db:generate`, `db:migrate`, `db:seed`, `db:push` scripts.
- DB client stable path: `src/api/src/lib/db.ts` regardless of ORM.
- Prisma uses upserts in seed; Drizzle uses `onConflictDoNothing()`.

### 2026-05-04: Auth Feature Module — SWA Easy Auth Integration
**By:** Trinity (Full-Stack Dev) | **Requested by:** Ben Leane
- `staticwebapp.config.json` route guards, login/logout via `/.auth/login/aad`, 401 redirect, SPA fallback.
- API auth helper (`src/api/src/lib/auth.ts`): `getUser()` + `requireAuth()` parsing `x-ms-client-principal` base64 header.
- Framework-specific hooks: Next.js (client + SSR), Vite+React (client-only), SvelteKit (`hooks.server.ts`).
- No additional npm dependencies — auth is header-based.

### 2026-05-04: Phase 2 Local Dev Infrastructure — Feature Module Patterns
**By:** Tank (Infra Dev) | **Requested by:** Ben Leane
- Docker Compose: PostgreSQL 16-alpine, named volume, healthcheck via `pg_isready`. Local-only plaintext creds.
- SWA CLI Config: Framework-specific output locations (`.next`, `dist`, `build`). Proxy on `localhost:4280`.
- Env Config: `.env` + `.env.example` generated. Auth vars conditional on `includeAuth`. 
- Scripts: `setup` (docker compose up + migrate + seed), `dev` (swa start). DevDeps: `@azure/static-web-apps-cli`, `azure-functions-core-tools`.

### 2026-05-04: CLI Entry Point Wired to Composer (Phase 2)
**By:** Neo (CLI Dev) | **Requested by:** Ben Leane
**What:** `src/index.ts` now composes features and generates projects to disk. The Phase 2 TODO is replaced with real logic.
**Feature assembly:** Always includes base, framework (one of three), api, database, docker, swaConfig, env. Auth is conditional on `includeAuth`. Features are composed via `compose()`, root `package.json` is built separately via `buildRootPackageJson()` and appended.
**Output:** Writes to `./{projectName}` relative to CWD. Checks for existing directory and confirms overwrite. Shows spinner during generation and next-steps note on success.
**Why:** Core CLI flow — users can now run the tool and get a real generated project.

### 2026-05-04: Template Generation Bug Fixes (6 issues from coffee-curator testing)
**By:** Neo (CLI Dev) | **Requested by:** Ben Leane
**What:** Fixed 6 bugs in feature modules that caused generated apps to fail at dev time.

1. **Missing `dotenv` dependency** — Added `dotenv: '^16.4.0'` to root dependencies via `envFeature`.
2. **Bad `--prefix` flags in swa-cli.config.json** — Removed `--prefix src/web` from Next.js `run` command in `swaConfigFeature`.
3. **Missing `src/api/local.settings.json`** — Added `local.settings.json` to `apiFeature` files.
4. **Double build in API start script** — Changed `start` from `npm run build && func start` to just `func start`.
5. **Removed `apiDevserverUrl` and `apiDevserverCommand`** — Stripped both from `swaConfigFeature`.
6. **API pre-build in setup script** — Updated `envFeature` setup script to include `npm run build:api`.

**Files changed:** `src/features/swa-config.ts`, `src/features/api.ts`, `src/features/env.ts`
**Why:** All issues discovered during real testing of a generated "coffee-curator" app. Fixes ensure generated projects work out of the box.

### 2026-05-04: Thread packageManager through all generated output
**By:** Neo (CLI Dev) | **Requested by:** Ben Leane
**What:** All generated scripts, README commands, and SWA config now respect the user's chosen package manager (npm/pnpm/yarn) instead of hardcoding `npm run`. Created `src/utils.ts` with `pmRun()` and `pmInstall()` helpers. Updated 8 feature modules + index.ts. Also changed `prestart` in sub-package api to use `tsc` directly to avoid PM dependency in sub-packages.
**Why:** When a user picks pnpm or yarn, all generated output should use their chosen PM — otherwise the prompts are misleading.

### 2026-05-04: Phase 3 — Infrastructure-as-Code Feature Module
**By:** Tank (Infra Dev) | **Requested by:** Ben Leane
**What:** Created `src/features/infra.ts` — a composable Feature module that generates all IaC files for Azure deployment via `azd up`.
**Files generated by the feature:**
- `infra/modules/swa.bicep` — Static Web App with SystemAssigned managed identity
- `infra/modules/postgres.bicep` — PostgreSQL Flexible Server with Entra ID auth, firewall rules, optional Entra admin
- `infra/modules/monitoring.bicep` — Log Analytics workspace + Application Insights
- `infra/modules/keyvault.bicep` — Key Vault with RBAC authorization, SWA identity gets Secrets User role
- `infra/main.bicep` — Subscription-scoped root template, creates resource group, wires all modules
- `infra/main.parameters.json` — azd-style parameter file with `${AZURE_ENV_NAME}` / `${AZURE_LOCATION}`
- `azure.yaml` — Two services (web: staticwebapp, api: function), postprovision migration hook
- `scripts/migrate.sh` — ORM-aware DB migration (Prisma or Drizzle)
**Why:** Phase 3 milestone — generated apps can now deploy to Azure with `azd up`.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
