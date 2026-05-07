import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000, // generous for CLI/file-system tests
    hookTimeout: 60_000, // cleanup of temp dirs with node_modules
  },
});
