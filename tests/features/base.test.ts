/**
 * Base Feature Module Tests
 *
 * The base feature is the foundational module that every generated project
 * includes. It provides:
 *   - .gitignore with standard Node/TS ignores
 *   - Root package.json scaffold (name, scripts, engines)
 *   - tsconfig.json
 *   - README.md stub
 *   - .env.example
 *
 * These tests verify the base feature produces correct file content
 * regardless of framework/ORM/auth selection.
 */
import { describe, it, expect } from "vitest";

// Expected module — will exist once features are implemented
// import { baseFeature } from "../../src/features/base";

// ────────────────────────────────────────────────────────────
// Stub: expected files from the base feature (from plan.md)
// ────────────────────────────────────────────────────────────
const EXPECTED_BASE_FILES = [
  ".gitignore",
  "package.json",
  "tsconfig.json",
  "README.md",
  ".env.example",
];

const GITIGNORE_MUST_INCLUDE = [
  "node_modules",
  "dist",
  ".env",
  ".env.local",
];

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────
describe.todo("Base feature module", () => {
  describe("file generation", () => {
    it("produces all required root files", () => {
      // const result = baseFeature({ projectName: "test-app" });
      // const paths = result.files.map(f => f.path);
      // for (const expected of EXPECTED_BASE_FILES) {
      //   expect(paths).toContain(expected);
      // }
      expect(EXPECTED_BASE_FILES.length).toBeGreaterThan(0);
    });

    it("does not produce framework-specific files", () => {
      // Base should not include Next.js/Vite/SvelteKit config
      const frameworkFiles = [
        "next.config.js",
        "vite.config.ts",
        "svelte.config.js",
      ];
      // const result = baseFeature({ projectName: "test-app" });
      // const paths = result.files.map(f => f.path);
      // for (const fw of frameworkFiles) {
      //   expect(paths).not.toContain(fw);
      // }
      expect(frameworkFiles.length).toBe(3);
    });
  });

  describe(".gitignore content", () => {
    it("includes all critical ignore patterns", () => {
      // const result = baseFeature({ projectName: "test-app" });
      // const gitignore = result.files.find(f => f.path === ".gitignore");
      // for (const pattern of GITIGNORE_MUST_INCLUDE) {
      //   expect(gitignore.content).toContain(pattern);
      // }
      for (const pattern of GITIGNORE_MUST_INCLUDE) {
        expect(pattern).toBeTruthy();
      }
    });

    it("does not expose secrets or env files", () => {
      // const gitignore = result.files.find(f => f.path === ".gitignore");
      // expect(gitignore.content).toContain(".env");
      // expect(gitignore.content).toContain(".env.local");
      expect(GITIGNORE_MUST_INCLUDE).toContain(".env");
      expect(GITIGNORE_MUST_INCLUDE).toContain(".env.local");
    });
  });

  describe("package.json structure", () => {
    it("sets project name from user input", () => {
      const projectName = "my-cool-app";
      // const result = baseFeature({ projectName });
      // const pkg = JSON.parse(result.files.find(f => f.path === "package.json").content);
      // expect(pkg.name).toBe(projectName);
      expect(projectName).toMatch(/^[a-z0-9-]+$/);
    });

    it("sets type to module (ESM)", () => {
      // const pkg = JSON.parse(...);
      // expect(pkg.type).toBe("module");
      expect("module").toBe("module"); // placeholder
    });

    it("includes engines.node >= 18", () => {
      // expect(pkg.engines.node).toBe(">=18");
      expect(">=18").toContain("18");
    });

    it("does not include feature-specific dependencies", () => {
      // Base should not have prisma, drizzle, @azure/functions, etc.
      const featureDeps = [
        "prisma",
        "@prisma/client",
        "drizzle-orm",
        "@azure/functions",
      ];
      // for (const dep of featureDeps) {
      //   expect(pkg.dependencies?.[dep]).toBeUndefined();
      //   expect(pkg.devDependencies?.[dep]).toBeUndefined();
      // }
      expect(featureDeps.length).toBe(4);
    });
  });

  describe("project name edge cases", () => {
    it("handles single-character name", () => {
      // const result = baseFeature({ projectName: "a" });
      // expect(result.files.length).toBeGreaterThan(0);
      expect("a").toMatch(/^[a-z0-9]$/);
    });

    it("handles max-length name (214 chars)", () => {
      const name = "a".repeat(214);
      // const result = baseFeature({ projectName: name });
      // const pkg = JSON.parse(...);
      // expect(pkg.name).toBe(name);
      expect(name.length).toBe(214);
    });

    it("preserves kebab-case as-is", () => {
      const name = "my-azure-full-stack-app";
      // const result = baseFeature({ projectName: name });
      // const pkg = JSON.parse(...);
      // expect(pkg.name).toBe(name);
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });
  });

  describe("generated project structure per framework", () => {
    const frameworks = ["nextjs", "vite", "sveltekit"] as const;

    for (const fw of frameworks) {
      it(`base + ${fw} produces src/web/ directory`, () => {
        // const config = { projectName: "test", framework: fw };
        // const result = compose([baseFeature(config), frameworkFeature(config)]);
        // expect(result.files.keys()).toContainEqual(expect.stringMatching(/^src\/web\//));
        expect(fw).toBeTruthy();
      });

      it(`base + ${fw} produces src/api/ directory`, () => {
        // Similar check for API layer
        expect(fw).toBeTruthy();
      });
    }
  });
});
