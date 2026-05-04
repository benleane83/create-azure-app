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
