# Code Review — May 7, 2026

## Remaining Items

These issues were identified during a full codebase review but have not yet been addressed.

---

### I4 — Route Rule Order-Dependency in `staticwebapp.config.json`

**Severity:** Medium  
**File:** `src/features/auth.ts` → `swaConfigContent()`

The generated `staticwebapp.config.json` has a catch-all `/*` route rule whose position matters. SWA evaluates routes top-to-bottom — if the catch-all appears before more specific rules, those rules will never match. The current ordering works, but it's fragile if someone adds routes above the catch-all.

**Fix:** Add a comment or reorder to make the intent explicit, or validate rule ordering programmatically.

---

### I6 — Test Stubs (No Real Coverage)

**Severity:** Medium  
**File:** `tests/`

All test files use `test.todo()` — no assertions are actually executed. This means regressions can be introduced without any test failures.

**Fix:** Implement real test cases, at minimum for `compose()`, `writeProject()`, and the feature functions that generate file content.

---

### M1 — Duplicate `PackageManager` Type

**Severity:** Low  
**Files:** `src/utils.ts`, `src/index.ts`

`PackageManager` is defined as a type in both files. If the allowed values diverge, the CLI prompts and downstream feature code will disagree.

**Fix:** Export the type from `utils.ts` only and import it in `index.ts`.

---

### M4 — SWA CLI `run` Only Wired for Next.js

**Severity:** Low  
**File:** `src/features/swa-config.ts` → `buildSwaConfig()`

The `run` field (which tells `swa start` how to launch the framework dev server) is only set for Next.js. Vite and SvelteKit configs omit it, so `swa start` won't auto-launch their dev servers.

**Fix:** Add `run: pmRun(packageManager, 'dev')` to the `vite-react` and `sveltekit` cases.

---

### M5 — Overly Permissive Firewall Rule

**Severity:** Low  
**File:** `src/features/infra.ts` → `migrateScript()`, `seedScript()` (bash + PowerShell variants)

The migrate and seed scripts open the PostgreSQL firewall to `0.0.0.0/0` (all IPs) during execution. While the rule is removed afterward, a failure mid-script leaves the database exposed.

**Fix:** Detect the runner's public IP (`curl ifconfig.me`) and open the firewall only for that IP. Add a `trap` / `try/finally` to ensure cleanup on failure.

---

### M9 — `writeProject()` No Error Handling

**Severity:** Low  
**File:** `src/composer.ts` → `writeProject()`

`writeProject()` calls `mkdirSync` and `writeFileSync` without try/catch. Filesystem errors (permissions, disk full, path too long) will throw unhandled exceptions with no user-friendly message.

**Fix:** Wrap in try/catch and surface a clear error via `@clack/prompts`.
