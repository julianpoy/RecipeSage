import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const RS_VERSION = process.env.VERSION || "VERSION-missing";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  integrations: [nodeProfilingIntegration()],

  tracesSampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || 1.0, 10),
  profilesSampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || 1.0, 10),
  skipOpenTelemetrySetup: true,

  environment: process.env.ENVIRONMENT || "unknown",
  release: RS_VERSION,
});
