# Project Context

- **Owner:** Ben Leane
- **Project:** create-azure-app — a `create-t3-app`-style interactive CLI that scaffolds AZD-compatible full-stack Azure projects (SWA + Functions + PostgreSQL + Entra ID)
- **Stack:** TypeScript, Node.js, clack (CLI prompts), Azure Static Web Apps, Azure Functions v4, PostgreSQL Flexible Server, Entra ID, Prisma/Drizzle, Bicep, Docker Compose, SWA CLI
- **Created:** 2026-05-04

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-05-04: Phase 2 Local Dev Feature Modules
- Feature module pattern: export a function taking a config object, return a `Feature` from `../composer.js`. Files are `{ path, content }` string literals.
- Docker Compose YAML is generated as a template literal — no YAML library needed, just careful indentation.
- SWA CLI config uses a typed `SwaCliConfig` interface to ensure the JSON structure matches the real schema. `JSON.stringify` handles serialization.
- Next.js uses port 3000 by default; Vite-based frameworks (React, SvelteKit) use 5173. SWA CLI proxy always on 4280.
- `envFeature` owns the `setup` and `dev` npm scripts since it's the integration point — those scripts depend on docker compose, SWA CLI, and migration tooling all being present.
- `.env` is gitignored (handled by base feature), `.env.example` is committed — standard pattern for secret-adjacent config.
- Key file paths: `src/features/docker.ts`, `src/features/swa-config.ts`, `src/features/env.ts`

### 2026-05-04: Cross-agent — Trinity's template & integration modules
- Trinity created frontend modules (`nextjs.ts`, `vite-react.ts`, `sveltekit.ts`), `api.ts` (Azure Functions v4), `database.ts` (Prisma/Drizzle), `auth.ts` (SWA Easy Auth)
- Sub-project deps in their own `package.json` FileEntry, not in `Feature.dependencies`
- DB client at `src/api/src/lib/db.ts`, auth helper at `src/api/src/lib/auth.ts` — stable paths for both ORMs
- Auth is header-based (no SDK deps); `staticwebapp.config.json` for route guards

### 2026-05-04: Cross-agent — Neo's template bug fixes affecting shared files
- Neo fixed 6 bugs in `swa-config.ts`, `api.ts`, `env.ts` — files co-owned by Tank and Trinity
- Changes to Tank's files: `swa-config.ts` lost `--prefix` flags and `apiDevserverUrl`/`apiDevserverCommand`; `env.ts` gained `dotenv` root dep and `build:api` in setup script
- Lesson: SWA CLI auto-starts func from `apiLocation` when no `apiDevserverUrl` is set — simpler config

### 2026-05-04: Phase 3 — Infrastructure-as-Code Feature Module
- Created `src/features/infra.ts` — generates all IaC files as a single Feature: 4 Bicep modules, main.bicep, main.parameters.json, azure.yaml, migration script
- Bicep modules: `swa.bicep` (SWA + SystemAssigned identity), `postgres.bicep` (Flexible Server + Entra auth + firewall + optional Entra admin), `monitoring.bicep` (Log Analytics + App Insights), `keyvault.bicep` (RBAC-enabled + Secrets User role for SWA identity)
- `main.bicep` targets subscription scope, creates resource group, wires modules with `uniqueString` resource tokens. Outputs all `AZURE_*` env vars for azd
- `azure.yaml` uses two services: `web` (staticwebapp) + `api` (function). Postprovision hook runs migration script
- Migration script builds `DATABASE_URL` from azd env vars. ORM-specific: Prisma uses `prisma migrate deploy`, Drizzle uses `drizzle-kit push`
- Bicep string interpolation (`${var}`) must be escaped as `\${var}` in JS template literals — easy to miss
- Key Vault Secrets User role GUID: `4633458b-17de-408a-b874-0445c86b69e6`
- `main.parameters.json` uses `${AZURE_ENV_NAME}` and `${AZURE_LOCATION}` — azd resolves these. DB password param has no default so azd prompts for it

### 2026-05-08: Fix #19 — Type deduplication across feature files
- Exported `Framework` and `ORM` types from `src/index.ts` (were local-only)
- Removed local `type Framework` redefinitions from `src/features/cicd.ts`, `src/features/swa-config.ts`, `src/features/tailwind.ts` — now import from `../index.js`
- Removed local `type PackageManager` from `src/features/cicd.ts` — now imports from `../utils.js`
- Pattern: canonical type sources are `src/index.ts` (Framework, ORM, ProjectConfig) and `src/utils.ts` (PackageManager)

### 2026-05-12: Generated shared repos must keep `.env.docker`
- Root cause for missing `.env.docker` in generated shared repos was the base feature adding that file to generated `.gitignore` output.
- `.env.docker` is non-secret local Docker Compose config in this project; generated repos should track it so `npm run setup` works on first pull.
- Focused regression coverage lives in `tests/features/base.test.ts` alongside the base feature behavior.
