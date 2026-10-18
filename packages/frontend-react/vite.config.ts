import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const ENVIRONMENT_FILE_BY_MODE: Record<string, string | undefined> = {
  production: "environment.prod.ts",
  selfhost: "environment.selfhost.ts",
  desktop: "environment.desktop.ts",
};

const SHARED_ASSETS_DIR = "../frontend/src/assets";

export default defineConfig(({ mode }) => {
  const environmentFile = ENVIRONMENT_FILE_BY_MODE[mode];

  return {
    server: {
      allowedHosts: true,
    },
    root: __dirname,
    base: "/app/",
    cacheDir: "../../node_modules/.vite/packages/frontend-react",
    publicDir: false,
    plugins: [
      react(),
      tailwindcss(),
      viteStaticCopy({
        targets: [
          {
            src: `${SHARED_ASSETS_DIR}/**/*`,
            dest: "assets",
            rename: { stripBase: 3 },
          },
          {
            src: "src/manifest.json",
            dest: ".",
            rename: { stripBase: 1 },
          },
          ...(mode === "desktop"
            ? []
            : [
                {
                  src: "src/service-worker.js",
                  dest: ".",
                  rename: { stripBase: 1 },
                },
              ]),
        ],
      }),
    ],
    resolve: {
      tsconfigPaths: true,
      alias: environmentFile
        ? [
            {
              find: /^(.*)\/environments\/environment$/,
              replacement: `$1/environments/${environmentFile.replace(/\.ts$/, "")}`,
            },
          ]
        : [],
    },
    build: {
      outDir: "www",
      emptyOutDir: true,
      assetsDir: "",
      sourcemap: mode === "production" ? "hidden" : false,
      chunkSizeWarningLimit: 2000,
      rolldownOptions: {
        output: {
          hashCharacters: "hex",
          entryFileNames: "[name].[hash:20].js",
          chunkFileNames: "[name].[hash:20].js",
          assetFileNames: "[name].[hash:20][extname]",
        },
      },
    },
    test: {
      watch: false,
      globals: false,
      environment: "node",
      include: ["src/**/*.{test,spec}.ts"],
      reporters: ["default"],
      passWithNoTests: true,
    },
  };
});
