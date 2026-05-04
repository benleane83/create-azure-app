# Project Context

- **Owner:** Ben Leane
- **Project:** create-azure-app — a `create-t3-app`-style interactive CLI that scaffolds AZD-compatible full-stack Azure projects (SWA + Functions + PostgreSQL + Entra ID)
- **Stack:** TypeScript, Node.js, clack (CLI prompts), Azure Static Web Apps, Azure Functions v4, PostgreSQL Flexible Server, Entra ID, Prisma/Drizzle, Bicep, Docker Compose, SWA CLI
- **Created:** 2026-05-04

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-05-04: Phase 1 Architecture Decisions
- **Structure:** Co-located modules in `src/modules/{name}/` — each module has `index.ts` (FeatureModule export) + `templates/` dir. No separate top-level templates directory.
- **Composition engine:** Hybrid approach — static file copies, light `{{var}}` interpolation, and programmatic assembly for package.json + shared configs (deep-merge). No template engine dependency.
- **Module interface:** `FeatureModule` with `enabled()`, `files()`, `dependencies()`, `scripts()`, `configContributions()`, `templateVars()`, `afterGenerate()`. Order field controls execution sequence.
- **Package:** Single npm package (not monorepo). ESM, Node 20+, bin entry `create-azure-app`. Build with tsup.
- **Runtime deps:** Only 3 — `@clack/prompts`, `picocolors`, `deepmerge`. Deliberately minimal.
- **Dev deps:** `tsup`, `typescript`, `vitest`, `@types/node`.
- **Rejected:** EJS/Handlebars (templates should look like output), fs-extra (native node:fs suffices at Node 20+), chalk (picocolors smaller), commander/yargs (overkill for 1 positional arg), execa (thin child_process wrapper instead).
- **Key file:** `plan.md` — full project plan with phases, generated project structure, verification criteria.
- **User preference:** Ben wants this modeled after create-t3-app DX. Speed and simplicity are priorities.
