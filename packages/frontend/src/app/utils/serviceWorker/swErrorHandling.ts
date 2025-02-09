import * as Sentry from "@sentry/browser";

/**
 * An error wrapper to keep the original http response
 * so that it can be passed back out of the service worker transparently
 * if cache fails
 */
export class SWHttpCapturedError extends Error {
  originalResponse: Response;

  constructor(originalResponse: Response) {
    super();

    this.originalResponse = originalResponse;
  }
}

/**
 * A place to decide if a status code coming from the server could be handled by
 * cache instead.
 */
export const swAssertStatusCacheDivert = (response: Response) => {
  // 500-level errors can be diverted to cache to make server downtime a little more pleasant
  if (response.status >= 500) {
    throw new SWHttpCapturedError(response);
  }
};

export enum SWCacheRejectReason {
  NoInput = "No input provided",
  NoCacheResult = "No cache result found",
  NoSession = "Not logged in, can't operate offline",
  NonOp = "This function is not available offline",
}

export const swCacheReject = (
  reason: SWCacheRejectReason,
  httpCapturedError: unknown,
) => {
  console.log("Service worker is rejecting due to ", reason);
  if (
    [SWCacheRejectReason.NoInput, SWCacheRejectReason.NoCacheResult].includes(
      reason,
    )
  ) {
    Sentry.captureMessage(`Unexpected SW cache reject ${reason}`, {
      extra: {
        reason,
        httpCapturedError,
      },
    });
  }

  if (httpCapturedError instanceof SWHttpCapturedError) {
    return httpCapturedError.originalResponse;
  }

  throw new Error(reason);
};
