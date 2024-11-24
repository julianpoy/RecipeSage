import { Component, Input } from "@angular/core";
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

@Component({
  selector: "page-auth",
  templateUrl: "auth.page.html",
  styleUrls: ["auth.page.scss"],
  providers: [UserService],
})
export class AuthPage {
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

  constructor(
    public events: EventService,
    public translate: TranslateService,
    public modalCtrl: ModalController,
    public navCtrl: NavController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public messagingService: MessagingService,
    public capabilitiesService: CapabilitiesService,
    public alertCtrl: AlertController,
    public route: ActivatedRoute,
    public userService: UserService,
  ) {
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
      ? await this.userService.login(
          {
            email: this.email,
            password: this.password,
          },
          {
            412: () =>
              this.presentAlert(
                "generic.error",
                "pages.auth.error.incorrectLogin",
              ),
          },
        )
      : await this.userService.register(
          {
            name: this.name,
            email: this.email,
            password: this.password,
          },
          {
            406: () =>
              this.presentAlert("generic.error", "pages.auth.error.emailTaken"),
          },
        );
    loading.dismiss();
    if (!response.success) return;

    localStorage.setItem("token", response.data.token);
    this.capabilitiesService.updateCapabilities();

    if (
      "Notification" in window &&
      (Notification as any).permission === "granted"
    ) {
      this.messagingService.requestNotifications();
    }

    this.events.publish(EventName.Auth);
    this.close();
  }

  signInWithGoogleComplete(token: string) {
    localStorage.setItem("token", token);
    this.capabilitiesService.updateCapabilities();

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

    const response = await this.userService.forgot({
      email: this.email,
    });

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

  logout() {
    this.utilService.removeToken();

    this.navCtrl.navigateRoot(RouteMap.WelcomePage.getPath());

    this.modalCtrl.dismiss();
  }
}
