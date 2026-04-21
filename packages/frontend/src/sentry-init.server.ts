import * as Sentry from "@sentry/node";

const DSN =
  "https://aaf472dea32adeb2a30335c9781361ed@o158500.ingest.us.sentry.io/4510138104741888";

if (process.env["NODE_ENV"] === "production") {
  const origin = process.env["SITE_ORIGIN"] ?? "";
  let sentryEnvironment = "production";
  if (origin.includes("beta.")) {
    sentryEnvironment = "beta";
  }

  Sentry.init({
    dsn: DSN,
    release: process.env["APP_VERSION"] || "development",
    environment: sentryEnvironment,
    integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
    tracesSampleRate: parseFloat(
      process.env["SENTRY_TRACE_SAMPLE_RATE"] ?? "0.1",
    ),
    initialScope: {
      tags: { runtime: "ssr" },
    },
  });
}
