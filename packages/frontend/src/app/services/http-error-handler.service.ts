import { Injectable } from "@angular/core";
import { ToastController, ModalController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { AuthPage } from "~/pages/auth/auth.page";

export interface ErrorHandlers {
  [code: string]: () => any;
}

@Injectable({
  providedIn: "root",
})
export class HttpErrorHandlerService {
  isAuthOpen: boolean = false; // Track auth modal so we don't open multiple stacks
  defaultErrorHandlers = {
    0: () => this.presentToast("errors.offline"),
    401: () => this.promptForAuth(),
    500: () => this.presentToast("errors.unexpected"),
  };

  constructor(
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private translate: TranslateService
  ) {}

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

  async presentToast(messageKey: string) {
    const message = await this.translate.get(messageKey).toPromise();

    const toast = await this.toastCtrl.create({
      message,
      duration: 5000,
    });

    toast.present();
  }

  handleError(error, errorHandlers?: ErrorHandlers) {
    const statusCode = error?.response?.status;
    // Rethrow all non-http errors
    if (!statusCode) throw error;

    // Use provided error handlers first
    if (errorHandlers?.[statusCode]) {
      errorHandlers[statusCode]();
      // Use provided catchall if passed
    } else if (errorHandlers?.["*"]) {
      errorHandlers["*"]();
      // Fallback to default
    } else if (this.defaultErrorHandlers[statusCode]) {
      this.defaultErrorHandlers[statusCode]();
      // All other errors use 500 by default for generic (unexpected) error
    } else {
      this.defaultErrorHandlers[500]();
    }
  }
}
