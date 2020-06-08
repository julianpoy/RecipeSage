import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

export interface ErrorHandlers {
  [code: string]: () => {}
}

@Injectable({
  providedIn: 'root'
})
export class HttpErrorHandlerService {

  defaultErrorHandlers = {
    0: async () => (await this.toastCtrl.create({
      message: `It looks like you\'re offline. While offline, we\'re only able to fetch data you\'ve previously accessed on this device.`,
      duration: 5000
    })).present(),
    401: async () => (await this.toastCtrl.create({
      message: `You are not authorized for this action! If you believe this is in error, please log out and log in using the side menu.`,
      duration: 5000
    })).present(),
    500: async () => (await this.toastCtrl.create({
      message: `An unexpected error occured. Please try again. If the problem continues to occur, please contact us.`,
      duration: 5000
    })).present(),
  };

  constructor(private toastCtrl: ToastController) {}

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
