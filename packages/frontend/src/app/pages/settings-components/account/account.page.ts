import { Component } from "@angular/core";
import {
  ToastController,
  AlertController,
  NavController,
} from "@ionic/angular";

import dayjs from "dayjs";

import { UserService } from "~/services/user.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";
import { RecipeService } from "~/services/recipe.service";
import { CapabilitiesService } from "~/services/capabilities.service";
import { getQueryParam } from "~/utils/queryParams";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "page-account",
  templateUrl: "account.page.html",
  styleUrls: ["account.page.scss"],
})
export class AccountPage {
  defaultBackHref: string = RouteMap.SettingsPage.getPath();
  contributePath: string = RouteMap.ContributePage.getPath();

  account: any = {
    password: "123456",
  };

  stats: any = {};

  nameChanged = false;
  emailChanged = false;
  passwordChanged = false;

  capabilitySubscriptions: any = {};

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public recipeService: RecipeService,
    public userService: UserService,
    public capabilitiesService: CapabilitiesService,
  ) {
    const resetToken = getQueryParam("token");
    if (resetToken) localStorage.setItem("token", resetToken);

    const loading = this.loadingService.start();

    Promise.all([
      this.userService.me(),
      this.userService.myStats(),
      this.capabilitiesService.updateCapabilities(),
    ]).then(([account, stats]) => {
      loading.dismiss();

      if (!account.success || !stats.success) return;

      this.account = account.data;
      this.account.password = "123456";

      this.stats = stats.data;
      this.stats.createdAt = this.utilService.formatDate(stats.data.createdAt, {
        now: true,
      });
      this.stats.lastLogin = stats.data.lastLogin
        ? this.utilService.formatDate(stats.data.lastLogin, { now: true })
        : this.stats.createdAt;

      Object.entries(this.capabilitiesService.capabilities).map(
        ([name, enabled]) => {
          this.capabilitySubscriptions[name] = {
            enabled,
            expired: this.getExpiryForCapability(name).expired,
            expires: this.getExpiryForCapability(name).expires,
          };
        },
      );
    });
  }

  getSubscriptionForCapability(capabilityName: string) {
    if (!this.account || !this.account.subscriptions) return null;

    try {
      const matchingSubscriptions = this.account.subscriptions
        .filter((subscription: any) =>
          subscription.capabilities.includes(capabilityName),
        )
        .sort((a: any, b: any) => {
          if (a.expires == null) return -1;
          if (b.expires == null) return 1;
          return new Date(a.expires) < new Date(b.expires);
        });
      if (matchingSubscriptions) return matchingSubscriptions[0];
    } catch (e) {
      console.error(e);
    }
  }

  getExpiryForCapability(capabilityName: string) {
    const subscription = this.getSubscriptionForCapability(capabilityName);
    if (!subscription)
      return {
        expired: null,
        expires: null,
      };
    if (!subscription.expires)
      return {
        expired: false,
        expires: null,
      };

    const expires = new Date(subscription.expires);
    return {
      expired: new Date(subscription.expires) < new Date(),
      expires: dayjs(expires).format("YYYY-MM-DD"),
    };
  }

  async saveName() {
    if (!this.account.name || this.account.name.length === 0) {
      const message = await this.translate
        .get("pages.account.nameRequired")
        .toPromise();

      const errorToast = await this.toastCtrl.create({
        message,
        duration: 5000,
      });
      errorToast.present();
      return;
    }

    const loading = this.loadingService.start();

    const response = await this.userService.update({
      name: this.account.name,
    });

    loading.dismiss();
    if (!response.success) return;

    this.nameChanged = false;

    const message = await this.translate
      .get("pages.account.nameUpdated")
      .toPromise();

    const tst = await this.toastCtrl.create({
      message,
      duration: 5000,
    });
    tst.present();
  }

  async saveEmail() {
    if (!this.account.email || this.account.email.length === 0) {
      const message = await this.translate
        .get("pages.account.emailRequired")
        .toPromise();

      (
        await this.toastCtrl.create({
          message,
          duration: 5000,
        })
      ).present();
      return;
    }

    const loading = this.loadingService.start();

    const response = await this.userService.update(
      {
        email: this.account.email,
      },
      {
        406: async () => {
          const message = await this.translate
            .get("pages.account.emailConflict")
            .toPromise();

          (
            await this.toastCtrl.create({
              message,
              duration: 5000,
            })
          ).present();
        },
        412: async () => {
          const message = await this.translate
            .get("pages.account.emailInvalid")
            .toPromise();

          (
            await this.toastCtrl.create({
              message,
              duration: 5000,
            })
          ).present();
        },
      },
    );

    loading.dismiss();
    if (!response.success) return;

    this.emailChanged = false;

    const message = await this.translate
      .get("pages.account.emailUpdated")
      .toPromise();

    const tst = await this.toastCtrl.create({
      message,
      duration: 5000,
    });
    tst.present();
  }

  async savePassword() {
    if (this.account.password !== this.account.confirmPassword) {
      const message = await this.translate
        .get("pages.account.passwordMatch")
        .toPromise();

      const tst = await this.toastCtrl.create({
        message,
        duration: 5000,
      });
      tst.present();
      return;
    }

    if (this.account.password.length < 6) {
      const message = await this.translate
        .get("pages.account.passwordLength")
        .toPromise();

      const tst = await this.toastCtrl.create({
        message,
        duration: 5000,
      });
      tst.present();
      return;
    }

    const loading = this.loadingService.start();

    const response = await this.userService.update({
      password: this.account.password,
    });
    loading.dismiss();
    if (!response.success) return;

    this.account.password = "*".repeat(this.account.password.length);
    this.passwordChanged = false;

    localStorage.removeItem("token");

    const header = await this.translate
      .get("pages.account.passwordUpdated.header")
      .toPromise();
    const message = await this.translate
      .get("pages.account.passwordUpdated.message")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: okay,
          handler: () => {
            this.navCtrl.navigateRoot(
              RouteMap.AuthPage.getPath(AuthType.Login),
            );
          },
        },
      ],
    });
    alert.present();
  }

  async deleteAccount() {
    const header = await this.translate
      .get("pages.account.deleteAccount.header")
      .toPromise();
    const message = await this.translate
      .get("pages.account.deleteAccount.message")
      .toPromise();
    const confirm = await this.translate.get("generic.delete").toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          handler: () => {},
        },
        {
          text: confirm,
          cssClass: "alertDanger",
          handler: async () => {
            const loading = this.loadingService.start();

            const response = await this.userService.delete();

            loading.dismiss();
            if (!response.success) return;

            this.utilService.removeToken();

            this.navCtrl.navigateRoot(RouteMap.WelcomePage.getPath());
          },
        },
      ],
    });
    alert.present();
  }

  async deleteAllRecipes() {
    const header = await this.translate
      .get("pages.account.deleteAllRecipes.header")
      .toPromise();
    const message = await this.translate
      .get("pages.account.deleteAllRecipes.message")
      .toPromise();
    const confirm = await this.translate
      .get("pages.account.deleteAllRecipes.confirm")
      .toPromise();
    const success = await this.translate
      .get("pages.account.deleteAllRecipes.success")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          handler: () => {},
        },
        {
          text: confirm,
          cssClass: "alertDanger",
          handler: async () => {
            const loading = this.loadingService.start();

            const response = await this.recipeService.deleteAll();

            loading.dismiss();
            if (!response.success) return;

            (
              await this.toastCtrl.create({
                message: success,
                duration: 5000,
              })
            ).present();
          },
        },
      ],
    });
    alert.present();
  }
}
