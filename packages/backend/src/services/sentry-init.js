import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { TRPCError } from "@trpc/server";

const RS_VERSION = process.env.VERSION || "VERSION-missing";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  integrations: [
    nodeProfilingIntegration(),
    Sentry.prismaIntegration(),
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
  ],

  sampleRate: parseFloat(process.env.SENTRY_ERROR_SAMPLE_RATE ?? "1.0"),
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE ?? "1.0"),
  profilesSampleRate: parseFloat(
    process.env.SENTRY_PROFILE_SAMPLE_RATE ?? "1.0",
  ),
  profileLifecycle: "trace",

  environment: process.env.ENVIRONMENT || "unknown",
  release: RS_VERSION,

  beforeSend: (event, hint) => {
    if (hint.originalException instanceof TRPCError) {
      const statusCode = getHTTPStatusCodeFromError(hint.originalException);

      // We do not want to log non-500 errors
      if (statusCode < 500) return null;

      event.tags = {
        ...event.tags,
        trpc_code: hint.originalException.code,
        trpc_statuscode: statusCode,
      };

      console.error(hint.originalException.cause || hint.originalException);
    }

    return event;
  },
});
