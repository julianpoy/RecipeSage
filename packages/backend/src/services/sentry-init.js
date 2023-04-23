const Sentry = require('@sentry/node');

// Importing @sentry/tracing patches the global hub for tracing to work.
require('@sentry/tracing');

const RS_VERSION = process.env.VERSION || 'VERSION-missing';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || 1.0, 10),

  environment: process.env.NODE_ENV,
  release: RS_VERSION
});
