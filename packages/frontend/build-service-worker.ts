#!/usr/bin/env tsx

import * as esbuild from "esbuild";
import path from "node:path";
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";

const watch = process.argv.includes("--watch");
const enableSourcemapUpload = process.env.SOURCEMAP_UPLOAD === "true";

const options: esbuild.BuildOptions = {
  entryPoints: [path.resolve(__dirname, "src/service-worker.ts")],
  bundle: true,
  outfile: path.resolve(__dirname, "src/service-worker.js"),
  platform: "browser",
  format: "iife",
  target: "es2020",
  minify: !watch,
  sourcemap: enableSourcemapUpload ? true : false,
  define: {
    "process.env.ENVIRONMENT": JSON.stringify(process.env.ENVIRONMENT ?? ""),
    "process.env.APP_VERSION": JSON.stringify(process.env.APP_VERSION ?? ""),
  },
  logLevel: "info",
  plugins: enableSourcemapUpload
    ? [
        sentryEsbuildPlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: "recipesage",
          project: "recipesage-service-worker",
          release: {
            name: process.env.APP_VERSION,
          },
        }),
      ]
    : [],
};

async function run() {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
  } else {
    await esbuild.build(options);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
