import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import {TranslateService} from '@ngx-translate/core';

export interface ErrorHandlers {
  [code: string]: () => any
}

@Injectable({
  providedIn: 'root'
})
export class HttpErrorHandlerService {

  defaultErrorHandlers = {
    0: () => this.presentToast('errors.offline'),
    401: () => this.presentToast('errors.unauthorized'),
    500: () => this.presentToast('errors.unexpected'),
  };

  constructor(
    private toastCtrl: ToastController,
    private translate: TranslateService,
  ) {}

  async presentToast(messageKey: string) {
    const message = await this.translate.get(messageKey).toPromise();

    const toast = await this.toastCtrl.create({
      message,
      duration: 5000
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
    // Fallback to default
    } else if (this.defaultErrorHandlers[statusCode]) {
      this.defaultErrorHandlers[statusCode]();
    // All other errors use 500 by default for generic (unexpected) error
    } else {
      this.defaultErrorHandlers[500]();
    }
  }
}
