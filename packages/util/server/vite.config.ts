/// <reference types='vitest' />
import { defineConfig } from "vite";

export default defineConfig(() => ({
  resolve: {
    tsconfigPaths: true,
  },
  root: __dirname,
  cacheDir: "../../../node_modules/.vite/packages/util/server",
  test: {
    watch: false,
    globals: true,
    environment: "node",
    include: ["{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../../coverage/packages/util/server",
      provider: "v8" as const,
      include: ["src/**/*.{js,ts}"],
    },
    passWithNoTests: true,
  },
}));
