#!/usr/bin/env tsx

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if sourcemap upload is enabled
const enableSourcemapUpload = process.env.SOURCEMAP_UPLOAD === "true";

if (!enableSourcemapUpload) {
  console.log(
    "Sourcemap upload is disabled. Set SOURCEMAP_UPLOAD=true to enable.",
  );
  process.exit(0);
}

// Check required environment variables
if (!process.env.SENTRY_AUTH_TOKEN) {
  console.error("SENTRY_AUTH_TOKEN environment variable is required");
  process.exit(1);
}

if (!process.env.APP_VERSION) {
  console.error("APP_VERSION environment variable is required");
  process.exit(1);
}

const org = "recipesage";
const project = "recipesage-frontend";
const release = process.env.APP_VERSION;
const distPath = path.resolve(__dirname, "www");

console.log(`Uploading sourcemaps for release: ${release}`);
console.log(`Organization: ${org}`);
console.log(`Project: ${project}`);
console.log(`Distribution path: ${distPath}`);

try {
  // Use the Sentry CLI from @sentry/webpack-plugin
  const sentryCliPath = path.resolve(
    __dirname,
    "../../node_modules/@sentry/cli/bin/sentry-cli",
  );

  // Create a new release
  execSync(
    `"${sentryCliPath}" releases new "${release}" --org "${org}" --project "${project}"`,
    {
      stdio: "inherit",
      env: {
        ...process.env,
        SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
      },
    },
  );

  // Upload sourcemaps
  execSync(
    `"${sentryCliPath}" sourcemaps upload --org "${org}" --project "${project}" --release "${release}" "${distPath}"`,
    {
      stdio: "inherit",
      env: {
        ...process.env,
        SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
      },
    },
  );

  // Finalize the release
  execSync(
    `"${sentryCliPath}" releases finalize "${release}" --org "${org}" --project "${project}"`,
    {
      stdio: "inherit",
      env: {
        ...process.env,
        SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
      },
    },
  );

  console.log("Sourcemaps uploaded successfully!");
} catch (error) {
  console.error(
    "Failed to upload sourcemaps:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
