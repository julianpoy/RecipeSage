import * as Sentry from "@sentry/browser";
import {
  environment,
  IS_SELFHOST,
  SENTRY_SAMPLE_RATE,
} from "./environments/environment";

const checkChunkLoadError = (error: Error) =>
  /Loading chunk \d+ failed/.test(error.message);
const checkSupressedError = (error: Error) =>
  /(Loading chunk \d+ failed)|(Cstr is undefined)|(Cannot read property 'isProxied' of undefined)|(Cannot read properties of undefined \(reading 'isProxied'\))|(\.isProxied)|(\[object Undefined\])/.test(
    error.message,
  );

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
      const error = hint.originalException as Error;
      if (checkChunkLoadError(error)) return null;
      if (checkSupressedError(error)) return null;
      return event;
    },
  });
}
