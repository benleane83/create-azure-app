# Code Review — May 7, 2026

## Remaining Items

These issues were identified during a full codebase review but have not yet been addressed.

---

### I6 — Test Stubs (No Real Coverage)

**Severity:** Medium  
**File:** `tests/`

All test files use `test.todo()` — no assertions are actually executed. This means regressions can be introduced without any test failures.

**Fix:** Implement real test cases, at minimum for `compose()`, `writeProject()`, and the feature functions that generate file content.

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
