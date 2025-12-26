import { Component, inject } from "@angular/core";
import { ToastController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { IS_SELFHOST } from "../../../../environments/environment";

import { UtilService, RouteMap } from "~/services/util.service";
import { CapabilitiesService } from "~/services/capabilities.service";
import {
  FeatureFlagKeys,
  FeatureFlagService,
} from "../../../services/feature-flag.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { TosClickwrapAgreementComponent } from "../../../components/tos-clickwrap-agreement/tos-clickwrap-agreement.component";
import { LogoIconComponent } from "../../../components/logo-icon/logo-icon.component";
import { TRPCService } from "../../../services/trpc.service";
import { appIdbStorageManager } from "../../../utils/appIdbStorageManager";

const BILLING_PORTAL_URL =
  "https://billing.stripe.com/p/login/dR6aFm6ex5vuauk8ww";

@Component({
  standalone: true,
  selector: "page-contribute",
  templateUrl: "contribute.page.html",
  styleUrls: ["contribute.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    TosClickwrapAgreementComponent,
    LogoIconComponent,
  ],
})
export class ContributePage {
  capabilitiesService = inject(CapabilitiesService);
  private trpcService = inject(TRPCService);
  private featureFlagService = inject(FeatureFlagService);
  private translate = inject(TranslateService);
  private utilService = inject(UtilService);
  private toastCtrl = inject(ToastController);

  billingPortalUrl = BILLING_PORTAL_URL;
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  frequency?: string;

  amount?: number;
  customAmount?: string;

  enableAssistant =
    this.featureFlagService.flags[FeatureFlagKeys.EnableAssistant];

  constructor() {
    if (IS_SELFHOST) {
      window.alert(
        "Opening the RecipeSage site, since selfhosted versions aren't linked to Stripe",
      );
      window.location.href = "https://recipesage.com/#/contribute";
    }

    this.capabilitiesService.updateCapabilities();
  }

  ionViewWillEnter() {
    this.buildBillingPortalUrl().then((url) => (this.billingPortalUrl = url));
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

    const response = await this.trpcService.handle(
      this.trpcService.trpc.payments.createStripeCheckoutSession.mutate({
        amount: amount * 100,
        isRecurring,
        successUrl: this.utilService.buildPublicRoutePath(
          RouteMap.ContributeThankYouPage.getPath(),
        ),
        cancelUrl: this.utilService.buildPublicRoutePath(
          RouteMap.ContributeCancelPage.getPath(),
        ),
      }),
      {
        412: async () => {
          (
            await this.toastCtrl.create({
              message,
              duration: 5000,
            })
          ).present();
        },
      },
    );
    if (!response || !response.url) return;

    window.location.href = response.url;
  }

  async buildBillingPortalUrl() {
    const url = new URL(
      "https://billing.stripe.com/p/login/dR6aFm6ex5vuauk8ww",
    );

    const session = await appIdbStorageManager.getSession();
    if (session?.email) {
      url.searchParams.set(
        "prefilled_email",
        encodeURIComponent(session.email),
      );
    }

    return url.toString();
  }
}
