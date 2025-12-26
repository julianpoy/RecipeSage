import { Component, Input, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  NavController,
  AlertController,
  ModalController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { IS_SELFHOST } from "../../../environments/environment";

import { EventName, EventService } from "~/services/event.service";
import { UserService } from "~/services/user.service";
import { LoadingService } from "~/services/loading.service";
import { MessagingService } from "~/services/messaging.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";
import { CapabilitiesService } from "~/services/capabilities.service";
import { TRPCService } from "../../services/trpc.service";
import { appIdbStorageManager } from "../../utils/appIdbStorageManager";
import type { SessionDTO } from "@recipesage/prisma";
import { SwCommunicationService } from "../../services/sw-communication.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { SignInWithGoogleComponent } from "../../components/sign-in-with-google/sign-in-with-google.component";
import { LogoIconComponent } from "../../components/logo-icon/logo-icon.component";
import { TosClickwrapAgreementComponent } from "../../components/tos-clickwrap-agreement/tos-clickwrap-agreement.component";
import { WebsocketService } from "../../services/websocket.service";

@Component({
  standalone: true,
  selector: "page-auth",
  templateUrl: "auth.page.html",
  styleUrls: ["auth.page.scss"],
  providers: [UserService],
  imports: [
    ...SHARED_UI_IMPORTS,
    SignInWithGoogleComponent,
    LogoIconComponent,
    TosClickwrapAgreementComponent,
  ],
})
export class AuthPage {
  private events = inject(EventService);
  private translate = inject(TranslateService);
  private modalCtrl = inject(ModalController);
  private navCtrl = inject(NavController);
  private utilService = inject(UtilService);
  private loadingService = inject(LoadingService);
  private messagingService = inject(MessagingService);
  private capabilitiesService = inject(CapabilitiesService);
  private swCommunicationService = inject(SwCommunicationService);
  private websocketService = inject(WebsocketService);
  private alertCtrl = inject(AlertController);
  private route = inject(ActivatedRoute);
  private trpcService = inject(TRPCService);

  @Input() startWithRegister?: boolean;

  showLogin = false;
  redirect?: string;

  isSelfHost = IS_SELFHOST;

  name = "";
  email = "";
  password = "";
  confirmPassword = "";

  isInModal = false;

  revealPassword = false;

  constructor() {
    if (this.route.snapshot.paramMap.get("authType") === AuthType.Register) {
      this.showLogin = false;
    } else {
      this.showLogin = true;
    }

    this.redirect =
      this.route.snapshot.queryParamMap.get("redirect") || undefined;
  }

  ionViewWillEnter() {
    if (typeof this.startWithRegister === "boolean")
      this.showLogin = !this.startWithRegister;
  }

  ionViewDidEnter() {
    this.modalCtrl.getTop().then((topModal) => {
      this.isInModal = !!topModal;
    });
  }

  async toggleLogin() {
    this.showLogin = !this.showLogin;
  }

  async presentAlert(headerI18n: string, messageI18n: string) {
    const header = await this.translate.get(headerI18n).toPromise();
    const message = await this.translate.get(messageI18n).toPromise();
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

  async auth() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.showLogin && !emailRegex.test(this.email)) {
      this.presentAlert("generic.error", "pages.auth.error.invalidEmail");
      return;
    }
    if (!this.showLogin && this.name.length < 1) {
      this.presentAlert("generic.error", "pages.auth.error.noName");
      return;
    }
    if (this.password.length === 0) {
      this.presentAlert("generic.error", "pages.auth.error.noPassword");
      return;
    }
    if (!this.showLogin && this.password.length < 6) {
      this.presentAlert("generic.error", "pages.auth.error.passwordLength");
      return;
    }
    if (this.email.length === 0) {
      this.presentAlert("generic.error", "pages.auth.error.noEmail");
      return;
    }
    if (!this.showLogin && this.password !== this.confirmPassword) {
      this.presentAlert("generic.error", "pages.auth.error.passwordMatch");
      return;
    }

    const loading = this.loadingService.start();

    const response = this.showLogin
      ? await this.trpcService.handle(
          this.trpcService.trpc.users.login.mutate({
            email: this.email,
            password: this.password,
          }),
          {
            403: () =>
              this.presentAlert(
                "generic.error",
                "pages.auth.error.incorrectPassword",
              ),
            404: () =>
              this.presentAlert(
                "generic.error",
                "pages.auth.error.incorrectEmail",
              ),
            409: () =>
              this.presentAlert("generic.error", "pages.auth.error.ssoAccount"),
          },
        )
      : await this.trpcService.handle(
          this.trpcService.trpc.users.register.mutate({
            name: this.name,
            email: this.email,
            password: this.password,
          }),
          {
            400: () =>
              this.presentAlert(
                "generic.error",
                "pages.auth.error.invalidEmailPassword",
              ),
            403: () =>
              this.presentAlert(
                "generic.error",
                "pages.auth.error.registrationDisabled",
              ),
            409: () =>
              this.presentAlert("generic.error", "pages.auth.error.emailTaken"),
          },
        );
    loading.dismiss();
    if (!response) return;

    localStorage.setItem("token", response.token);
    const lastUserId = await appIdbStorageManager.getLastSessionUserId();
    if (lastUserId !== response.userId) {
      await appIdbStorageManager.deleteAllData();
    }
    await appIdbStorageManager.setSession(response);
    this.swCommunicationService.triggerFullCacheSync();

    this.capabilitiesService.updateCapabilities();
    this.websocketService.triggerReconnect();

    if (
      "Notification" in window &&
      (Notification as any).permission === "granted"
    ) {
      this.messagingService.requestNotifications();
    }

    this.events.publish(EventName.Auth);
    this.close();
  }

  async signInWithGoogleComplete(session: SessionDTO) {
    localStorage.setItem("token", session.token);
    const lastUserId = await appIdbStorageManager.getLastSessionUserId();
    if (lastUserId !== session.userId) {
      await appIdbStorageManager.deleteAllData();
    }
    await appIdbStorageManager.setSession(session);
    this.swCommunicationService.triggerFullCacheSync();

    this.capabilitiesService.updateCapabilities();
    this.websocketService.triggerReconnect();

    if (
      "Notification" in window &&
      (Notification as any).permission === "granted"
    ) {
      this.messagingService.requestNotifications();
    }

    this.events.publish(EventName.Auth);
    this.close();
  }

  async forgotPassword() {
    if (!this.email) {
      await this.presentAlert("generic.error", "pages.auth.error.invalidEmail");
      return;
    }

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.users.forgotPassword.mutate({
        email: this.email,
      }),
      {
        404: () =>
          this.presentAlert("generic.error", "pages.auth.error.incorrectEmail"),
      },
    );

    loading.dismiss();

    if (!response) return;

    await this.presentAlert(
      "pages.auth.forgot.alert.header",
      "pages.auth.forgot.alert.message",
    );
  }

  showLegal(e: Event) {
    e.preventDefault();
    this.navCtrl.navigateForward(RouteMap.LegalPage.getPath());
  }

  async close() {
    const isInModal = await this.modalCtrl.getTop();
    if (isInModal) {
      await this.modalCtrl.dismiss();
    } else {
      this.navCtrl.navigateRoot(
        this.redirect || RouteMap.HomePage.getPath("main"),
      );
    }
  }

  async logout() {
    localStorage.removeItem("token");
    await appIdbStorageManager.deleteAllData();

    this.navCtrl.navigateRoot(RouteMap.WelcomePage.getPath());

    this.modalCtrl.dismiss();
  }
}
