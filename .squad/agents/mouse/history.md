# Project Context

- **Owner:** Ben Leane
- **Project:** create-azure-app — a `create-t3-app`-style interactive CLI that scaffolds AZD-compatible full-stack Azure projects (SWA + Functions + PostgreSQL + Entra ID)
- **Stack:** TypeScript, Node.js, clack (CLI prompts), Azure Static Web Apps, Azure Functions v4, PostgreSQL Flexible Server, Entra ID, Prisma/Drizzle, Bicep, Docker Compose, SWA CLI
- **Created:** 2026-05-04

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-05-04: Test Infrastructure Created

- **Test framework:** Vitest with `vitest.config.ts` at root. Globals enabled, node environment, 30s timeout.
- **Test files:**
  - `tests/cli.test.ts` — 5 describe blocks, covers prompt config, project name validation, framework×ORM combos, defaults vs non-defaults (18 tests)
  - `tests/composer.test.ts` — 5 describe blocks, covers single/multi-feature merge, file conflicts, dependency conflicts, output structure (10 tests)
  - `tests/features/base.test.ts` — 5 describe blocks, covers file generation, .gitignore content, package.json structure, name edge cases, per-framework structure (18 tests)
- **All tests use `describe.todo()`** — recognized by vitest but skipped until implementation exists.
- **Expected API shapes documented:** `ProjectConfig`, `FeatureModule`, `ComposerResult` interfaces are defined in test files as contracts for the implementation team.
- **Key file paths:** `vitest.config.ts`, `tests/cli.test.ts`, `tests/composer.test.ts`, `tests/features/base.test.ts`
- **Package.json already existed** with vitest + test scripts (created by another agent). No conflicts.
- **Project name validation pattern:** `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` with 214 char npm limit.

### 2026-05-04: Cross-agent update (from Neo's implementation)
- ⚠️ **Framework value mismatch:** Tests use `'vite'` but Neo's implementation uses `'vite-react'`. Update test stubs.
- ⚠️ **Auth field mismatch:** Tests use `auth: boolean` but Neo's implementation uses `includeAuth: boolean`. Update test stubs.
- Neo's composer exports: `Feature`, `FileEntry`, `compose()`, `writeProject()`. Last-write-wins on same-path files.
- Separate `buildRootPackageJson()` function handles generated project's package.json after composition.

### 2026-05-08: copilotInstructionsFeature tests added to integration.test.ts

- `copilotInstructionsFeature` lives at `src/features/copilot-instructions.ts`. Generates `.github/copilot-instructions.md` always (no opt-out).
- The integration test `generateProject()` helper was NOT including this feature — added it alongside the other always-on features.
- Added `existsSync` + `readFileSync` imports from `node:fs` (separate from `node:fs/promises`).
- Assertions added as step 8 inside the existing pairwise loop — no new test cases needed. The 6-row pairwise set already covers all combos: nextjs/vite-react/sveltekit × prisma/drizzle × auth/no-auth.
- Assertions per test case: file exists, contains project name, contains framework label, contains ORM schema path, contains/excludes `x-ms-client-principal` based on `includeAuth`, contains "Files to Leave Alone".
- `expect` is available globally (vitest `globals: true`) — no import needed.
- TypeScript check passes cleanly after changes.
