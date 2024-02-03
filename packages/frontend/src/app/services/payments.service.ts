import { Injectable } from "@angular/core";

import { HttpService } from "./http.service";
import { UtilService } from "./util.service";

import { STRIPE_PK } from "../../environments/environment";
import { ErrorHandlers } from "./http-error-handler.service";

@Injectable({
  providedIn: "root",
})
export class PaymentsService {
  stripe: any;

  constructor(
    public httpService: HttpService,
    public utilService: UtilService,
  ) {
    const stripeScriptEl = document.createElement("script");
    stripeScriptEl.onload = () => this.init();
    stripeScriptEl.src = "https://js.stripe.com/v3/";
    document.head.appendChild(stripeScriptEl);
  }

  init() {
    this.stripe = (window as any).Stripe(STRIPE_PK);
  }

  generateCustomSession(
    payload: {
      amount: number;
      isRecurring: boolean;
      successUrl: string;
      cancelUrl: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<any>(
      `payments/stripe/custom-session`,
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
  }

  async launchStripeCheckout(sessionId: string) {
    await this.stripe
      .redirectToCheckout({
        sessionId,
      })
      .then((response?: { error?: Error }) => {
        console.error(response?.error?.message, response?.error);
      });
  }
}
