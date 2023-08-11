import { Component } from "@angular/core";
import { ToastController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { IS_SELFHOST } from "../../../../environments/environment";

import { UtilService, RouteMap } from "~/services/util.service";
import { PaymentsService } from "~/services/payments.service";
import { CapabilitiesService } from "~/services/capabilities.service";

@Component({
  selector: "page-contribute",
  templateUrl: "contribute.page.html",
  styleUrls: ["contribute.page.scss"],
})
export class ContributePage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  frequency?: string;

  amount?: number;
  customAmount?: string;

  constructor(
    public capabilitiesService: CapabilitiesService,
    private translate: TranslateService,
    private utilService: UtilService,
    private paymentsService: PaymentsService,
    private toastCtrl: ToastController
  ) {
    if (IS_SELFHOST) {
      window.alert(
        "Opening the RecipeSage site, since selfhosted versions aren't linked to Stripe"
      );
      window.location.href = "https://recipesage.com/#/contribute";
    }

    this.capabilitiesService.updateCapabilities();
  }

  setAmount(amount: number) {
    this.amount = amount;
    this.customAmount = undefined;
  }

  focusCustom() {
    this.amount = undefined;
    this.customAmount = "0.00";
  }

  setFrequency(frequency: "monthly" | "single") {
    this.frequency = frequency;
    this.amount = undefined;
    this.customAmount = undefined;
  }

  validAmount(): boolean {
    try {
      if (this.amount) return true;
      if (!this.customAmount) return false;

      const customAmount = parseFloat(this.customAmount);
      return !!customAmount;
    } catch (e) {
      return false;
    }
  }

  async contribute() {
    let amount = 0;
    if (this.amount) amount = this.amount;
    else if (this.customAmount) amount = parseFloat(this.customAmount);
    else return;

    const isRecurring = this.frequency === "monthly";

    const message = await this.translate
      .get("pages.contribute.minimum", { amount: isRecurring ? 1 : 5 })
      .toPromise();

    const response = await this.paymentsService.generateCustomSession(
      {
        amount: amount * 100,
        isRecurring,
        successUrl: this.utilService.buildPublicRoutePath(
          RouteMap.ContributeThankYouPage.getPath()
        ),
        cancelUrl: this.utilService.buildPublicRoutePath(
          RouteMap.ContributeCancelPage.getPath()
        ),
      },
      {
        412: async () => {
          (
            await this.toastCtrl.create({
              message,
              duration: 5000,
            })
          ).present();
        },
      }
    );
    if (!response.success) return;

    await this.paymentsService.launchStripeCheckout(response.data.id);
  }
}
