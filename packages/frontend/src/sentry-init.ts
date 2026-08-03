import * as Sentry from "@sentry/browser";
import {
  environment,
  IS_SELFHOST,
  SENTRY_SAMPLE_RATE,
} from "./environments/environment";

const SUPPRESSED_ERROR_MESSAGES =
  /(dynamically imported module)|(Importing a module script failed)|(Cstr is undefined)|(Cannot read property 'isProxied' of undefined)|(Cannot read properties of undefined \(reading 'isProxied'\))|(\.isProxied)|(\[object Undefined\])/;

const checkSuppressedError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : undefined;

  return !!message && SUPPRESSED_ERROR_MESSAGES.test(message);
};

if (!IS_SELFHOST) {
  const hostname = window.location.hostname;
  let sentryEnvironment = environment.production ? "production" : "development";
  if (sentryEnvironment === "production" && hostname.startsWith("beta.")) {
    sentryEnvironment = "beta";
  }

  Sentry.init({
    release: (window as any).version,
    environment: sentryEnvironment,
    dsn: "https://aaf472dea32adeb2a30335c9781361ed@o158500.ingest.us.sentry.io/4510138104741888",
    transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
    tracesSampleRate: SENTRY_SAMPLE_RATE,
    beforeSend(event, hint) {
      if (checkSuppressedError(hint.originalException)) return null;
      return event;
    },
  });
}
