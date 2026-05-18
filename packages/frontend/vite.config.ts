import { defineConfig } from "vitest/config";

export default defineConfig({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/packages/frontend",
  test: {
    watch: false,
    globals: false,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    reporters: ["default"],
    passWithNoTests: true,
  },
});
