/**
 * CLI Prompt Flow Tests
 *
 * Verifies that the interactive prompt function returns a valid, complete
 * configuration object covering all user-facing options from the plan:
 *   - projectName, framework, orm, auth, packageManager
 *
 * These tests run against the prompt config builder, NOT against the
 * interactive terminal UI (that requires e2e harness).
 */
import { describe, it, expect } from "vitest";

// Expected module — will exist once CLI code is implemented
// import { resolveConfig, type ProjectConfig } from "../src/cli";

// ────────────────────────────────────────────────────────────
// Types mirroring expected CLI config shape (from plan.md)
// ────────────────────────────────────────────────────────────
interface ProjectConfig {
  projectName: string;
  framework: "nextjs" | "vite" | "sveltekit";
  orm: "prisma" | "drizzle";
  auth: boolean;
  packageManager: "npm" | "pnpm" | "yarn";
}

const VALID_FRAMEWORKS = ["nextjs", "vite", "sveltekit"] as const;
const VALID_ORMS = ["prisma", "drizzle"] as const;
const VALID_PKG_MANAGERS = ["npm", "pnpm", "yarn"] as const;

// ────────────────────────────────────────────────────────────
// Default config — all defaults as stated in plan.md
// ────────────────────────────────────────────────────────────
const DEFAULTS: ProjectConfig = {
  projectName: "my-app",
  framework: "nextjs",
  orm: "prisma",
  auth: true,
  packageManager: "npm",
};

describe.todo("CLI prompt flow", () => {
  // Unskip once src/cli.ts exports resolveConfig
  describe("resolveConfig returns a valid ProjectConfig", () => {
    it("returns all required fields when all defaults accepted", async () => {
      // const config = await resolveConfig(DEFAULTS);
      const config = DEFAULTS; // placeholder
      expect(config).toHaveProperty("projectName");
      expect(config).toHaveProperty("framework");
      expect(config).toHaveProperty("orm");
      expect(config).toHaveProperty("auth");
      expect(config).toHaveProperty("packageManager");
    });

    it("framework value is one of the allowed options", () => {
      const config = DEFAULTS;
      expect(VALID_FRAMEWORKS).toContain(config.framework);
    });

    it("orm value is one of the allowed options", () => {
      const config = DEFAULTS;
      expect(VALID_ORMS).toContain(config.orm);
    });

    it("packageManager value is one of the allowed options", () => {
      const config = DEFAULTS;
      expect(VALID_PKG_MANAGERS).toContain(config.packageManager);
    });

    it("auth is a boolean", () => {
      const config = DEFAULTS;
      expect(typeof config.auth).toBe("boolean");
    });
  });

  describe("project name validation", () => {
    it("rejects empty project name", () => {
      // const result = validateProjectName("");
      // expect(result.valid).toBe(false);
      expect("").toBeFalsy(); // placeholder assertion
    });

    it("rejects project name with special characters", () => {
      const bad = ["my app!", "my@app", "my/app", "my\\app", "..", ""];
      for (const name of bad) {
        // const result = validateProjectName(name);
        // expect(result.valid).toBe(false);
        expect(name).not.toMatch(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);
      }
    });

    it("accepts valid kebab-case names", () => {
      const good = ["my-app", "cool-project", "a", "my-azure-app-2"];
      for (const name of good) {
        expect(name).toMatch(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);
      }
    });

    it("rejects names starting with a hyphen", () => {
      expect("-my-app").not.toMatch(/^[a-z0-9]/);
    });

    it("rejects names longer than 214 characters (npm limit)", () => {
      const long = "a".repeat(215);
      expect(long.length).toBeGreaterThan(214);
      // const result = validateProjectName(long);
      // expect(result.valid).toBe(false);
    });
  });

  describe("framework × ORM combinations", () => {
    for (const fw of VALID_FRAMEWORKS) {
      for (const orm of VALID_ORMS) {
        it(`accepts ${fw} + ${orm}`, () => {
          const config: ProjectConfig = { ...DEFAULTS, framework: fw, orm };
          expect(config.framework).toBe(fw);
          expect(config.orm).toBe(orm);
        });
      }
    }
  });

  describe("all-defaults vs all-non-defaults", () => {
    it("all defaults produce valid config", () => {
      const config = { ...DEFAULTS };
      expect(config.framework).toBe("nextjs");
      expect(config.orm).toBe("prisma");
      expect(config.auth).toBe(true);
    });

    it("all non-default options produce valid config", () => {
      const config: ProjectConfig = {
        projectName: "alt-app",
        framework: "sveltekit",
        orm: "drizzle",
        auth: false,
        packageManager: "pnpm",
      };
      expect(config.framework).toBe("sveltekit");
      expect(config.orm).toBe("drizzle");
      expect(config.auth).toBe(false);
      expect(config.packageManager).toBe("pnpm");
    });
  });
});
