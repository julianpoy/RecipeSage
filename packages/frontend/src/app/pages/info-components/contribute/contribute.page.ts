import { Component, computed, inject } from "@angular/core";
import { Router } from "@angular/router";
import { AlertController, NavController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import { Capacitor } from "@capacitor/core";

import { IS_SELFHOST } from "../../../../environments/environment";

import type { Product } from "@capgo/native-purchases";

import { SubscriptionPlatform } from "@recipesage/util/shared";

import {
  UtilService,
  RouteMap,
  AuthType,
} from "../../../services/util.service";
import { serverConfig } from "../../../utils/serverConfig";
import { CapabilitiesService } from "../../../services/capabilities.service";
import { IapService } from "../../../services/iap.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { TosClickwrapAgreementComponent } from "../../../components/tos-clickwrap-agreement/tos-clickwrap-agreement.component";
import { LogoIconComponent } from "../../../components/logo-icon/logo-icon.component";
import { ServerActionsService } from "../../../services/server-actions.service";
import { appIdbStorageManager } from "../../../utils/appIdbStorageManager";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonBackButton,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
} from "@ionic/angular/standalone";
import { arrowForwardOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

const BILLING_PORTAL_URL =
  "https://billing.stripe.com/p/login/dR6aFm6ex5vuauk8ww";

const APPLE_MANAGE_URL = "https://apps.apple.com/account/subscriptions";
const GOOGLE_MANAGE_URL = "https://play.google.com/store/account/subscriptions";

@Component({
  standalone: true,
  selector: "page-contribute",
  templateUrl: "contribute.page.html",
  styleUrls: ["contribute.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    TosClickwrapAgreementComponent,
    LogoIconComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner,
  ],
})
export class ContributePage {
  capabilitiesService = inject(CapabilitiesService);
  private serverActionsService = inject(ServerActionsService);
  private translate = inject(TranslateService);
  private utilService = inject(UtilService);
  private alertCtrl = inject(AlertController);
  private navCtrl = inject(NavController);
  private iapService = inject(IapService);
  private router = inject(Router);

  showBack = false;

  billingPortalUrl = BILLING_PORTAL_URL;
  appleManageUrl = APPLE_MANAGE_URL;
  googleManageUrl = GOOGLE_MANAGE_URL;
  defaultBackHref: string = RouteMap.AboutPage.getPath();
  aboutHref: string = RouteMap.AboutPage.getPath();

  private meQuery = this.serverActionsService.users.getMe({ 401: () => {} });
  me = this.meQuery.value;

  frequency?: string;

  amount?: number;
  customAmount?: string;

  isNative = Capacitor.isNativePlatform();
  nativeFrequency: "monthly" | "yearly" = "monthly";
  nativeProducts: Product[] = [];
  loadingProducts = false;
  purchasing = false;

  private nativeOfferings?: { monthly: Product[]; yearly: Product[] };

  constructor() {
    addIcons({ arrowForwardOutline });

    if (this.router.getCurrentNavigation()?.extras.state?.showBack) {
      this.showBack = true;
    }
    // Contributions are hosted-only. A custom server preset means the user is
    // pointed at a non-hosted backend (self-hosting), so redirect them to
    // recipesage.com to donate.
    if (IS_SELFHOST || serverConfig.preset === "custom") {
      void this.redirectSelfhost();
      return;
    }

    this.capabilitiesService.updateCapabilities();

    if (this.isNative) {
      void this.loadNativeOfferings();
    }
  }

  private async redirectSelfhost() {
    const message = await this.translate
      .get("pages.contribute.selfhostRedirect")
      .toPromise();
    window.alert(message);
    window.location.href = `https://recipesage.com/app${RouteMap.ContributePage.getPath()}`;
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

  setFrequency(frequency: "monthly" | "yearly" | "single") {
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

    const minimumAmount = this.frequency === "monthly" ? 1 : 10;

    const response =
      await this.serverActionsService.payments.createStripeCheckoutSession(
        {
          amount: amount * 100,
          frequency: this.frequency as "monthly" | "yearly" | "single",
          successUrl: this.utilService.buildPublicRoutePath(
            RouteMap.ContributeThankYouPage.getPath(),
          ),
          cancelUrl: this.utilService.buildPublicRoutePath(
            RouteMap.ContributeCancelPage.getPath(),
          ),
        },
        {
          412: async () => {
            await this.presentAlert(
              "generic.error",
              "pages.contribute.minimum",
              { amount: minimumAmount },
            );
          },
        },
      );
    if (!response || !response.url) return;

    window.location.href = response.url;
  }

  async loadNativeOfferings() {
    this.loadingProducts = true;
    try {
      this.nativeOfferings = await this.iapService.getOfferings();
      this.updateNativeProducts();
    } catch (e) {
      console.error("Failed to load contribution offerings", e);
    } finally {
      this.loadingProducts = false;
    }
  }

  private async requireLogin(): Promise<boolean> {
    if (this.utilService.isLoggedIn()) return true;

    const header = await this.translate
      .get("pages.contribute.native.loginRequiredHeader")
      .toPromise();
    const message = await this.translate
      .get("pages.contribute.native.loginRequired")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: okay,
          handler: () => {
            this.navCtrl.navigateForward(
              RouteMap.AuthPage.getPath(AuthType.Login),
            );
          },
        },
      ],
    });
    await alert.present();

    return false;
  }

  selectNativeFrequency(frequency: "monthly" | "yearly") {
    this.nativeFrequency = frequency;
    this.updateNativeProducts();
  }

  private updateNativeProducts() {
    if (!this.nativeOfferings) {
      this.nativeProducts = [];
      return;
    }

    this.nativeProducts =
      this.nativeFrequency === "monthly"
        ? this.nativeOfferings.monthly
        : this.nativeOfferings.yearly;
  }

  async purchaseNative(product: Product) {
    if (this.purchasing) return;
    if (!(await this.requireLogin())) return;
    this.purchasing = true;

    try {
      const granted = await this.iapService.purchase(product);
      await this.meQuery.refresh();
      if (granted) {
        this.navCtrl.navigateForward(RouteMap.ContributeThankYouPage.getPath());
      } else {
        await this.presentAlert(
          "pages.contribute.native.notActivatedHeader",
          "pages.contribute.native.notActivated",
        );
      }
    } catch (e) {
      console.error("Native purchase did not complete", e);
    } finally {
      this.purchasing = false;
    }
  }

  async restoreNative() {
    if (this.purchasing) return;
    if (!(await this.requireLogin())) return;
    this.purchasing = true;

    try {
      const granted = await this.iapService.restore();
      await this.meQuery.refresh();
      if (granted > 0) {
        await this.presentAlert(
          "pages.contribute.native.restoredHeader",
          "pages.contribute.native.restored",
        );
      } else {
        await this.presentAlert(
          "pages.contribute.native.noPurchasesHeader",
          "pages.contribute.native.noPurchases",
        );
      }
    } catch (e) {
      console.error("Restore purchases failed", e);
      await this.presentAlert("generic.error", "pages.contribute.native.error");
    } finally {
      this.purchasing = false;
    }
  }

  async manageNative() {
    try {
      await this.iapService.manageSubscriptions();
    } catch (e) {
      console.error("Open manage subscriptions failed", e);
    }
  }

  activeSubscriptionPlatforms = computed<string[]>(() => {
    const me = this.me();
    if (!me) return [];

    const now = Date.now();
    return [
      ...new Set(
        me.subscriptions
          .filter(
            (subscription) =>
              subscription.expires === null ||
              new Date(subscription.expires).getTime() > now,
          )
          .map((subscription) => subscription.platform),
      ),
    ];
  });

  hasActiveSubscription = computed(
    () => this.activeSubscriptionPlatforms().length > 0,
  );

  hasAppleSubscription = computed(() =>
    this.activeSubscriptionPlatforms().includes(SubscriptionPlatform.Apple),
  );

  hasGoogleSubscription = computed(() =>
    this.activeSubscriptionPlatforms().includes(SubscriptionPlatform.Google),
  );

  hasStripeSubscription = computed(() =>
    this.activeSubscriptionPlatforms().includes(SubscriptionPlatform.Stripe),
  );

  hasStoreSubscription = computed(
    () => this.hasAppleSubscription() || this.hasGoogleSubscription(),
  );

  showStripePortal = computed(
    () => !this.hasStoreSubscription() || this.hasStripeSubscription(),
  );

  subscriptionInfoLoaded = computed(
    () => !this.utilService.isLoggedIn() || this.me() !== undefined,
  );

  private async presentAlert(
    headerKey: string,
    messageKey: string,
    messageParams?: Record<string, unknown>,
  ) {
    const header = await this.translate.get(headerKey).toPromise();
    const message = await this.translate
      .get(messageKey, messageParams)
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: okay,
        },
      ],
    });
    await alert.present();
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
