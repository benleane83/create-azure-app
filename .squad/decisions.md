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
- Runtime deps (3): `@clack/prompts`, `picocolors`, `deepmerge`.
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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
