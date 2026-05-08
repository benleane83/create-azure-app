# Project Context

- **Owner:** Ben Leane
- **Project:** create-azure-app — a `create-t3-app`-style interactive CLI that scaffolds AZD-compatible full-stack Azure projects (SWA + Functions + PostgreSQL + Entra ID)
- **Stack:** TypeScript, Node.js, clack (CLI prompts), Azure Static Web Apps, Azure Functions v4, PostgreSQL Flexible Server, Entra ID, Prisma/Drizzle, Bicep, Docker Compose, SWA CLI
- **Created:** 2026-05-04

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-05-04: Phase 1 CLI initialization
- **Build chain:** tsup (build) + tsx (dev) + tsc (typecheck). ESM throughout with Node16 module resolution.
- **Prompt lib:** @clack/prompts v0.10 — `p.group()` wraps all prompts, `onCancel` handles Ctrl+C gracefully.
- **Type pattern:** clack's `select()` infers types from `as const` on option values. The `p.group()` return includes `symbol` in union — cast results when assigning to typed config.
- **Composition architecture:** `Feature` interface with `files`, `dependencies`, `devDependencies`, `scripts`. `compose()` merges features (last-write-wins on file paths). `writeProject()` writes to disk.
- **Base feature:** Separate `buildRootPackageJson()` function generates the generated project's package.json after composition — so it can include merged deps from all features.
- **Framework values:** `'nextjs' | 'vite-react' | 'sveltekit'` — existing test stubs from Mouse use `'vite'` which will need alignment.
- **Auth field:** Named `includeAuth: boolean` in ProjectConfig — existing test stubs use `auth: boolean`, needs alignment.
- **Key files:** `src/index.ts` (entry), `src/composer.ts` (engine), `src/features/base.ts` (base feature).
- **Node.js target:** >=20.0.0, tsconfig targets ES2022.

### 2026-05-04: Phase 2 — CLI wired to composer
- **Feature assembly order:** base → framework → api → database → docker → swaConfig → env → auth (conditional). Auth is pushed last only if `includeAuth` is true.
- **Feature function signatures vary.** `nextjsFeature`/`viteReactFeature`/`sveltekitFeature`/`apiFeature` take full `ProjectConfig`. `databaseFeature` takes `{ orm, projectName }`. `authFeature` takes `{ framework }`. `dockerFeature` takes `{ projectName }`. `swaConfigFeature` takes `{ framework }`. `envFeature` takes `{ projectName, orm, includeAuth }`.
- **Root package.json is added AFTER compose()** — it's not a feature file. `buildRootPackageJson()` merges all composed deps/scripts, then the entry is appended to the file list.
- **Directory overwrite check:** Uses `existsSync` + `p.confirm()` before writing. `p.isCancel()` check handles Ctrl+C during the confirm prompt.
- **Spinner:** `p.spinner()` wraps the `writeProject()` call. Shows file count on stop.

### 2026-05-04: Template bug fixes — 6 issues from coffee-curator testing
- **SWA CLI `run` commands:** Do NOT use `--prefix` flags. SWA CLI runs `run` commands from `appLocation`, so `--prefix` doubles the path.
- **SWA CLI API auto-start:** Do NOT set `apiDevserverUrl` or `apiDevserverCommand`. When `apiLocation` is set and no `apiDevserverUrl` is present, SWA CLI automatically runs `func start` from `apiLocation`. Setting `apiDevserverUrl` makes SWA wait for an external process that nothing starts.
- **Azure Functions `local.settings.json`:** MUST be generated. `func start` fails without it. Minimum viable content: `{ IsEncrypted: false, Values: { FUNCTIONS_WORKER_RUNTIME: "node", AzureWebJobsStorage: "" } }`.
- **Avoid double builds:** If a `prestart` hook builds, the `start` script should NOT also build. Double builds cause SWA CLI startup timeouts.
- **API pre-build in setup:** The `setup` script must include `npm run build:api` so the API's `dist/` exists before the first `npm run dev`. Without it, `func start` fails on missing compiled output.
- **Root deps:** `dotenv` needed at root for env loading. Framework deps (next, react, etc.) correctly go in sub-project `package.json`, not root.

### 2026-05-04: Package manager threading
- **Helper file:** `src/utils.ts` exports `pmRun(pm, script)` and `pmInstall(pm)`. yarn uses `yarn <script>` (no `run` keyword); npm/pnpm use `<pm> run <script>`.
- **Signature changes:** `baseFeature` now takes `(projectName, packageManager)`. `swaConfigFeature` and `envFeature` options objects now include `packageManager`. Framework features + apiFeature already had `ProjectConfig` which includes `packageManager`.
- **Sub-package prestart:** Changed `src/api/package.json` `prestart` from `npm run build` to `tsc` directly — avoids PM dependency in sub-packages entirely.
- **All hardcoded `npm run` references replaced:** README, SWA CLI config `run` field, setup script, dev/build root scripts, success message in index.ts.

### 2026-05-04: Cross-agent update — infra feature wired into index.ts
- **Tank created `src/features/infra.ts`** (Phase 3 IaC). It was added to the feature composition in `src/index.ts` — infra feature is always included in the feature assembly, similar to docker/swaConfig/env.
- **New generated files from infra feature:** `infra/modules/swa.bicep`, `infra/modules/postgres.bicep`, `infra/modules/monitoring.bicep`, `infra/modules/keyvault.bicep`, `infra/main.bicep`, `infra/main.parameters.json`, `azure.yaml`, `scripts/migrate.sh`.

### 2026-05-08: Code review fixes batch (FIX #14, #17, #18, #21, #22, #23)
- **FIX #14:** `src/features/api.ts` — Prisma `prestart` script no longer hardcodes `npm run`. Inlines commands via `npx prisma generate` directly, making it package-manager agnostic.
- **FIX #17:** `src/index.ts` — Added `--version`/`-v` and `--help`/`-h` flag handling at top of `main()`. Reads version from `../package.json` relative to the script file. Added `readFileSync` import.
- **FIX #18:** `src/index.ts` — `git init` now logs a warning (`p.log.warn`) on failure instead of silently swallowing errors.
- **FIX #21:** `package.json` — Added `"files": ["dist"]` to prevent publishing the entire repo to npm.
- **FIX #22:** `package.json` — Added `repository`, `homepage`, and `bugs` fields pointing to `github.com/benleane83/create-azure-app`.
- **FIX #23:** `README.md` — Corrected Tailwind CSS default from "Yes" to "No" to match `initialValue: false` in code.
