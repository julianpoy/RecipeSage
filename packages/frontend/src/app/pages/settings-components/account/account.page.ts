import { Component, inject } from "@angular/core";
import { AlertController, NavController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import dayjs from "dayjs";

import { LoadingService } from "../../../services/loading.service";
import {
  UtilService,
  RouteMap,
  AuthType,
} from "../../../services/util.service";
import { CapabilitiesService } from "../../../services/capabilities.service";
import { getQueryParam } from "../../../utils/queryParams";
import { TRPCService } from "../../../services/trpc.service";
import { appIdbStorageManager } from "../../../utils/appIdbStorageManager";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  selector: "page-account",
  templateUrl: "account.page.html",
  styleUrls: ["account.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class AccountPage {
  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private alertCtrl = inject(AlertController);
  private utilService = inject(UtilService);
  private loadingService = inject(LoadingService);
  private trpcService = inject(TRPCService);
  private capabilitiesService = inject(CapabilitiesService);

  defaultBackHref: string = RouteMap.SettingsPage.getPath();
  contributePath: string = RouteMap.ContributePage.getPath();

  me: Awaited<
    ReturnType<typeof this.trpcService.trpc.users.getMe.query>
  > | null = null;

  myStats: Awaited<
    ReturnType<typeof this.trpcService.trpc.users.getMyStats.query>
  > | null = null;

  name = "";
  nameChanged = false;
  email = "";
  emailChanged = false;
  password = "123456";
  confirmPassword = "";
  passwordChanged = false;

  capabilitySubscriptions: Record<
    string,
    {
      enabled: boolean;
      expires: string | null;
      expired: boolean | null;
    }
  > = {};

  constructor() {
    const resetToken = getQueryParam("token");
    if (resetToken) localStorage.setItem("token", resetToken);

    const loading = this.loadingService.start();

    Promise.all([
      this.trpcService.handle(this.trpcService.trpc.users.getMe.query()),
      this.trpcService.handle(this.trpcService.trpc.users.getMyStats.query()),
      this.capabilitiesService.updateCapabilities(),
    ]).then(async ([me, myStats]) => {
      loading.dismiss();

      if (!me || !myStats) return;

      this.me = me;

      if (resetToken) {
        const lastUserId = await appIdbStorageManager.getLastSessionUserId();
        if (lastUserId !== me.id) {
          await appIdbStorageManager.deleteAllData();
        }
        await appIdbStorageManager.setSession({
          userId: me.id,
          email: me.email,
          token: resetToken,
        });
      }

      this.name = me.name;
      this.email = me.email;

      this.myStats = myStats;

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
    if (!this.me || !this.me.subscriptions) return null;

    try {
      const matchingSubscriptions = this.me.subscriptions
        .filter((subscription) =>
          subscription.capabilities.includes(
            capabilityName as (typeof subscription.capabilities)[0],
          ),
        )
        .sort((a, b) => {
          if (a.expires == null) return -1;
          if (b.expires == null) return 1;
          return new Date(a.expires).getTime() - new Date(b.expires).getTime();
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
    const okay = await this.translate.get("generic.okay").toPromise();

    if (!this.name.trim()) {
      const header = await this.translate.get("generic.error").toPromise();
      const message = await this.translate
        .get("pages.account.nameRequired")
        .toPromise();

      const errorToast = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: okay,
          },
        ],
      });
      errorToast.present();
      return;
    }

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.users.updateUser.mutate({
        name: this.name,
      }),
    );

    loading.dismiss();
    if (!response) return;

    this.nameChanged = false;

    const message = await this.translate
      .get("pages.account.nameUpdated")
      .toPromise();

    const tst = await this.alertCtrl.create({
      message,
      buttons: [
        {
          text: okay,
        },
      ],
    });
    tst.present();
  }

  async saveEmail() {
    const okay = await this.translate.get("generic.okay").toPromise();

    if (!this.email.trim()) {
      const message = await this.translate
        .get("pages.account.emailRequired")
        .toPromise();

      (
        await this.alertCtrl.create({
          message,
          buttons: [
            {
              text: okay,
            },
          ],
        })
      ).present();
      return;
    }

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.users.updateUser.mutate({
        email: this.email,
      }),
      {
        400: async () => {
          const message = await this.translate
            .get("pages.account.emailInvalid")
            .toPromise();

          (
            await this.alertCtrl.create({
              message,
            })
          ).present();
        },
        409: async () => {
          const message = await this.translate
            .get("pages.account.emailConflict")
            .toPromise();

          (
            await this.alertCtrl.create({
              message,
            })
          ).present();
        },
      },
    );

    loading.dismiss();
    if (!response) return;

    this.emailChanged = false;

    const message = await this.translate
      .get("pages.account.emailUpdated")
      .toPromise();

    const tst = await this.alertCtrl.create({
      message,
      buttons: [
        {
          text: okay,
        },
      ],
    });
    tst.present();
  }

  async savePassword() {
    const okay = await this.translate.get("generic.okay").toPromise();

    if (this.password !== this.confirmPassword) {
      const message = await this.translate
        .get("pages.account.passwordMatch")
        .toPromise();

      const tst = await this.alertCtrl.create({
        message,
        buttons: [
          {
            text: okay,
          },
        ],
      });
      tst.present();
      return;
    }

    if (this.password.length < 6) {
      const message = await this.translate
        .get("pages.account.passwordLength")
        .toPromise();

      const tst = await this.alertCtrl.create({
        message,
        buttons: [
          {
            text: okay,
          },
        ],
      });
      tst.present();
      return;
    }

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.users.updateUser.mutate({
        password: this.password,
      }),
    );
    loading.dismiss();
    if (!response) return;

    this.password = "*".repeat(this.password.length);
    this.passwordChanged = false;
    this.confirmPassword = "";

    localStorage.removeItem("token");
    await appIdbStorageManager.removeSession();

    const header = await this.translate
      .get("pages.account.passwordUpdated.header")
      .toPromise();
    const message = await this.translate
      .get("pages.account.passwordUpdated.message")
      .toPromise();

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

            const response = await this.trpcService.handle(
              this.trpcService.trpc.users.deleteUser.mutate(),
            );

            loading.dismiss();
            if (!response) return;

            localStorage.removeItem("token");
            await appIdbStorageManager.removeSession();

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
    const okay = await this.translate.get("generic.okay").toPromise();
    const successHeader = await this.translate
      .get("pages.account.deleteAllRecipes.success.header")
      .toPromise();
    const successMessage = await this.translate
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

            const response = await this.trpcService.handle(
              this.trpcService.trpc.recipes.deleteAllRecipes.mutate(),
            );

            loading.dismiss();
            if (!response) return;

            (
              await this.alertCtrl.create({
                header: successHeader,
                message: successMessage,
                buttons: [
                  {
                    text: okay,
                  },
                ],
              })
            ).present();
          },
        },
      ],
    });
    alert.present();
  }

  formatDate(date: Date) {
    return this.utilService.formatDate(date, {
      now: true,
    });
  }
}
