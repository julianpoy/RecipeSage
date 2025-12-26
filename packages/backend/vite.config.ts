/// <reference types='vitest' />
import { defineConfig } from "vite";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { nxCopyAssetsPlugin } from "@nx/vite/plugins/nx-copy-assets.plugin";

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/packages/backend",
  server: {
    port: 4200,
    host: "localhost",
  },
  preview: {
    port: 4300,
    host: "localhost",
  },
  plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(["*.md"])],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: "../../dist/packages/backend",
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ["@sentry/node"],
  },
  test: {
    watch: false,
    globals: true,
    hookTimeout: 30000,
    environment: "node",
    include: ["{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/packages/backend",
      provider: "v8" as const,
      include: ["src/**/*.{js,ts}"],
    },
  },
}));
