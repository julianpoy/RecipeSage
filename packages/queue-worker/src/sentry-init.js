import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const RS_VERSION = process.env.VERSION || "VERSION-missing";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  integrations: [
    nodeProfilingIntegration(),
    Sentry.prismaIntegration(),
    Sentry.httpIntegration(),
  ],

  sampleRate: parseFloat(process.env.SENTRY_ERROR_SAMPLE_RATE ?? "1.0"),
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE ?? "1.0"),
  profileSessionSampleRate: parseFloat(
    process.env.SENTRY_PROFILE_SESSION_SAMPLE_RATE ?? "1.0",
  ),
  profileLifecycle: "trace",

  environment: process.env.ENVIRONMENT || "unknown",
  release: RS_VERSION,
});
