import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";
import { build } from "esbuild";

build({
  sourcemap: process.env.SOURCEMAP_UPLOAD === "true", // Source map generation must be turned on for Sentry
  bundle: true,
  plugins: [
    // Put the Sentry esbuild plugin after all other plugins
    sentryEsbuildPlugin({
      disable: process.env.SOURCEMAP_UPLOAD !== "true",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "recipesage",
      project: "api",
    }),
  ],
});
