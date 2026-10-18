import type { AppRouter } from "@recipesage/trpc";
import type { TRPCClientError } from "@trpc/client";
import * as Sentry from "@sentry/react";
import { HttpError } from "./HttpError";

import { IS_SELFHOST } from "../environments/environment";
import { i18n } from "../i18n/i18n";
import { showAlert } from "../components/dialogs/showAlert";

export interface ErrorHandlers {
  [code: string]: (error: Error) => unknown;
}

const TRANSPORT_FAILURE_STATUS_CODE = 0;
const UNKNOWN_FAILURE_STATUS_CODE = 500;

let isAuthOpen = false; // Track auth modal so we don't open multiple stacks
let isErrorAlertOpen = false;

const presentAlert = async (
  headerKey: "generic.error" | "errors.resourceNotFound",
  messageKey:
    | "errors.offline"
    | "errors.resourceNotFound.message"
    | "errors.unexpected"
    | "errors.unexpected.selfhost",
) => {
  if (isErrorAlertOpen) return;
  isErrorAlertOpen = true;

  try {
    await showAlert({
      header: i18n.t(headerKey),
      message: i18n.t(messageKey),
      buttons: [
        {
          text: i18n.t("generic.ignore"),
          role: "cancel",
          variant: "destructive",
        },
        {
          text: i18n.t("generic.reload"),
          handler: () => {
            window.location.reload();
          },
        },
      ],
    });
  } finally {
    isErrorAlertOpen = false;
  }
};

const presentUnexpectedError = (error: Error, statusCode: number) => {
  Sentry.captureException(error, {
    extra: {
      statusCode,
    },
  });

  void presentAlert(
    "generic.error",
    IS_SELFHOST ? "errors.unexpected.selfhost" : "errors.unexpected",
  );
};

const promptForAuth = async () => {
  if (isAuthOpen) return;
  isAuthOpen = true;

  const { openAuthDialog } = await import("../pages/auth/openAuthDialog");
  await openAuthDialog();

  isAuthOpen = false;

  window.location.reload();
};

const presentCreditLimitNotice = async () => {
  if (isErrorAlertOpen) return;
  isErrorAlertOpen = true;

  try {
    await showAlert({
      header: i18n.t("errors.creditsLimitReached.title"),
      message: i18n.t("errors.creditsLimitReached"),
      preline: true,
      buttons: [
        {
          text: i18n.t("generic.moreInfo"),
          handler: () => {
            window.open(
              "https://docs.recipesage.com/docs/tutorials/contributing/#usage-limits",
              "_blank",
              'rel="noopener"',
            );
          },
        },
        {
          text: i18n.t("generic.close"),
          role: "cancel",
        },
      ],
    });
  } finally {
    isErrorAlertOpen = false;
  }
};

const defaultErrorHandlers: Record<number, (error: Error) => void> = {
  0: () => void presentAlert("generic.error", "errors.offline"),
  401: () => void promptForAuth(),
  404: () =>
    void presentAlert(
      "errors.resourceNotFound",
      "errors.resourceNotFound.message",
    ),
  420: () => void presentCreditLimitNotice(),
  429: (error) => {
    // A little brittle, but tRPC doesn't support custom error codes for 420
    if (error.message === "Daily credit limit reached") {
      void presentCreditLimitNotice();
    } else {
      presentUnexpectedError(error, 429);
    }
  },
  500: (error) => presentUnexpectedError(error, 500),
};

const handleStatusError = (
  statusCode: number,
  error: Error,
  errorHandlers?: ErrorHandlers,
) => {
  // Use provided error handlers first
  const providedHandler = errorHandlers?.[statusCode];
  if (providedHandler) {
    providedHandler(error);
    return;
  }

  // Use provided catchall if passed
  const catchallHandler = errorHandlers?.["*"];
  if (catchallHandler) {
    catchallHandler(error);
    return;
  }

  // Fallback to default error handlers to present more friendly messages
  const defaultErrorHandler = defaultErrorHandlers[statusCode];
  if (defaultErrorHandler) {
    console.warn(error);
    defaultErrorHandler(error);
    return;
  }

  // All other errors use 500 by default for generic (unexpected) error
  console.error(error);
  presentUnexpectedError(error, statusCode);
};

const inferTransportFailureStatusCode = (
  error: TRPCClientError<AppRouter>,
): number => {
  if (!navigator.onLine) return TRANSPORT_FAILURE_STATUS_CODE;

  return error.cause instanceof TypeError
    ? TRANSPORT_FAILURE_STATUS_CODE
    : UNKNOWN_FAILURE_STATUS_CODE;
};

export const httpErrorHandler = {
  handleError(error: unknown, errorHandlers?: ErrorHandlers) {
    // Rethrow all non-http errors
    if (!(error instanceof HttpError)) {
      throw error;
    }

    const statusCode = error.response.status;

    handleStatusError(statusCode, error, errorHandlers);
  },

  handleTrpcError(
    error: TRPCClientError<AppRouter>,
    errorHandlers?: ErrorHandlers,
  ) {
    const statusCode =
      error.data?.httpStatus ?? inferTransportFailureStatusCode(error);

    handleStatusError(statusCode, error, errorHandlers);
  },
};
