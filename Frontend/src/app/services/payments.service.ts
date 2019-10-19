import { Injectable } from '@angular/core';

import { HttpService } from './http.service';
import { UtilService } from './util.service';

import { STRIPE_PK } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  stripe;

  constructor(
    public httpService: HttpService,
    public utilService: UtilService
  ) {
    this.stripe = (window as any).Stripe(STRIPE_PK);
  }

  generateCustomSession(amount: number, isRecurring: boolean, successUrl: string, cancelUrl: string) {
    const url = this.utilService.getBase() + 'payments/stripe/custom-session' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data: {
        amount,
        isRecurring,
        successUrl,
        cancelUrl
      }
    }).then(response => response.data);
  }

  async launchStripeCheckout(sessionId: string) {
    await this.stripe.redirectToCheckout({
      sessionId
    }).then(response => {
      console.error(response.error.message, response.error);
    });
  }
}
