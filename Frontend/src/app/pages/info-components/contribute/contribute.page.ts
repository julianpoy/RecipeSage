import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';

import { UtilService, RouteMap } from '@/services/util.service';
import { PaymentsService } from '@/services/payments.service';
import { CapabilitiesService } from '@/services/capabilities.service';

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
    private capabilitiesService: CapabilitiesService,
    private utilService: UtilService,
    private paymentsService: PaymentsService,
    private toastCtrl: ToastController
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
    ).catch(async err => {
      switch (err.response.status) {
        case 0:
          const offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 412:
          const invalidAmount = await this.toastCtrl.create({
            message: `Unfortunately the minimum amount is $${isRecurring ? 1 : 5} due to transaction fees - apologies`,
            duration: 5000
          });
          invalidAmount.present();
          break;
        default:
          const errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });

    if (!session) return;

    await this.paymentsService.launchStripeCheckout(session.id);
  }
}
