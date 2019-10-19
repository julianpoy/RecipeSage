import { Component } from '@angular/core';

import { UtilService, RouteMap } from '@/services/util.service';
import { PaymentsService } from '@/services/payments.service';

@Component({
  selector: 'page-contribute',
  templateUrl: 'contribute.page.html',
  styleUrls: ['contribute.page.scss']
})
export class ContributePage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  frequency: string;

  amount: number;
  customAmount: string;

  constructor(
    private utilService: UtilService,
    private paymentsService: PaymentsService
  ) {}

  setAmount(amount: number) {
    this.amount = amount;
    this.customAmount = null;
  }

  focusCustom() {
    this.amount = null;
    this.customAmount = '0.00';
  }

  setFrequency(frequency: 'monthly' | 'single') {
    this.frequency = frequency;
    this.amount = null;
    this.customAmount = null;
  }

  validAmount() {
    try {
      const customAmount = parseFloat(this.customAmount);
      return this.amount || customAmount;
    } catch (e) {
      return false;
    }
  }

  async contribute() {
    const amount = this.amount ? this.amount : parseFloat(this.customAmount);
    const isRecurring = this.frequency === 'monthly';

    const session = await this.paymentsService.generateCustomSession(
      amount * 100,
      isRecurring,
      this.utilService.buildPublicRoutePath(RouteMap.ContributeThankYouPage.getPath()),
      this.utilService.buildPublicRoutePath(RouteMap.ContributeCancelPage.getPath())
    );

    await this.paymentsService.launchStripeCheckout(session.id);
  }
}
