import { ServerError } from "./errors";
import Sentry from "@sentry/node";

export const logError = (e: unknown) => {
  console.error(e);

  let status;
  if (e instanceof ServerError) {
    status = e.status;
  } else {
    status = 500;
  }

  const isExpectedError = status < 500 || status > 599;
  if (isExpectedError) return;

  Sentry.captureException(e);
};
