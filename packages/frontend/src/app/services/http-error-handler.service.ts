import { Injectable, inject } from "@angular/core";
import { ModalController, AlertController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import type { AppRouter } from "@recipesage/trpc";
import { TRPCClientError } from "@trpc/client";
import { AxiosError } from "axios";
import * as Sentry from "@sentry/browser";

import { AuthPage } from "~/pages/auth/auth.page";
import { IS_SELFHOST } from "../../environments/environment";

export interface ErrorHandlers {
  [code: string]: (error: Error) => any;
}

@Injectable({
  providedIn: "root",
})
export class HttpErrorHandlerService {
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);

  isAuthOpen: boolean = false; // Track auth modal so we don't open multiple stacks
  defaultErrorHandlers: Record<number, (error: Error) => void> = {
    0: () => this.presentAlert("generic.error", "errors.offline"),
    401: () => this.promptForAuth(),
    404: () =>
      this.presentAlert(
        "errors.resourceNotFound",
        "errors.resourceNotFound.message",
      ),
    500: (error) => {
      Sentry.captureException(error);
      this.presentAlert(
        "generic.error",
        IS_SELFHOST ? "errors.unexpected.selfhost" : "errors.unexpected",
      );
    },
  };
  isErrorAlertOpen = false;

  async promptForAuth() {
    if (this.isAuthOpen) return;
    this.isAuthOpen = true;

    const modal = await this.modalCtrl.create({
      component: AuthPage,
      backdropDismiss: false,
    });

    await modal.present();

    await modal.onDidDismiss();

    this.isAuthOpen = false;

    window.location.reload();
  }

  async presentAlert(headerKey: string, messageKey: string) {
    if (this.isErrorAlertOpen) return;
    this.isErrorAlertOpen = true;

    try {
      const header = await this.translate.get(headerKey).toPromise();
      const message = await this.translate.get(messageKey).toPromise();
      const reload = await this.translate.get("generic.reload").toPromise();
      const ignore = await this.translate.get("generic.ignore").toPromise();

      const toast = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: ignore,
            cssClass: "alertDanger",
          },
          {
            text: reload,
            handler: () => {
              window.location.reload();
            },
          },
        ],
      });

      await toast.present();
      await toast.onDidDismiss();
      this.isErrorAlertOpen = false;
    } catch (e) {
      this.isErrorAlertOpen = false;
      throw e;
    }
  }

  _handleError(
    statusCode: number,
    error: Error,
    errorHandlers?: ErrorHandlers,
  ) {
    // Use provided error handlers first
    if (errorHandlers?.[statusCode]) {
      errorHandlers[statusCode](error);
      return;
    }

    // Use provided catchall if passed
    if (errorHandlers?.["*"]) {
      errorHandlers["*"](error);
      return;
    }

    // Fallback to default error handlers to present more friendly messages
    if (
      this.defaultErrorHandlers[
        statusCode as keyof typeof this.defaultErrorHandlers
      ]
    ) {
      // We don't care about these errors since they're relatively expected
      if (statusCode !== 0 && statusCode !== 401) {
        Sentry.captureException(error, {
          extra: {
            statusCode,
          },
        });
        console.error(error);
      } else {
        console.warn(error);
      }
      this.defaultErrorHandlers[
        statusCode as keyof typeof this.defaultErrorHandlers
      ](error);
      return;
    }

    // All other errors use 500 by default for generic (unexpected) error
    Sentry.captureException(error, {
      extra: {
        statusCode,
      },
    });
    console.error(error);
    this.defaultErrorHandlers[500](error);
  }

  handleError(error: unknown, errorHandlers?: ErrorHandlers) {
    // Rethrow all non-http errors
    if (!(error instanceof Error) || !("response" in error)) {
      throw error;
    }

    // Error has been confirmed to have response property, treat as AxiosError
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status ?? 500;

    this._handleError(statusCode, error, errorHandlers);
  }

  handleTrpcError(
    error: TRPCClientError<AppRouter>,
    errorHandlers?: ErrorHandlers,
  ) {
    const statusCode = error.data?.httpStatus ?? 500;

    this._handleError(statusCode, error, errorHandlers);
  }
}
