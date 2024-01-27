import { Component, Input } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  NavController,
  ToastController,
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
    public toastCtrl: ToastController,
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

  async presentToast(message: string) {
    (
      await this.toastCtrl.create({
        message,
        duration: 6000,
      })
    ).present();
  }

  async auth() {
    const invalidEmail = await this.translate
      .get("pages.auth.error.invalidEmail")
      .toPromise();
    const noName = await this.translate
      .get("pages.auth.error.noName")
      .toPromise();
    const noPassword = await this.translate
      .get("pages.auth.error.noPassword")
      .toPromise();
    const noEmail = await this.translate
      .get("pages.auth.error.noEmail")
      .toPromise();
    const passwordLength = await this.translate
      .get("pages.auth.error.passwordLength")
      .toPromise();
    const passwordMatch = await this.translate
      .get("pages.auth.error.passwordMatch")
      .toPromise();
    const incorrectLogin = await this.translate
      .get("pages.auth.error.incorrectLogin")
      .toPromise();
    const emailTaken = await this.translate
      .get("pages.auth.error.emailTaken")
      .toPromise();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.showLogin && !emailRegex.test(this.email)) {
      this.presentToast(invalidEmail);
      return;
    }
    if (!this.showLogin && this.name.length < 1) {
      this.presentToast(noName);
      return;
    }
    if (this.password.length === 0) {
      this.presentToast(noPassword);
      return;
    }
    if (!this.showLogin && this.password.length < 6) {
      this.presentToast(passwordLength);
      return;
    }
    if (this.email.length === 0) {
      this.presentToast(noEmail);
      return;
    }
    if (!this.showLogin && this.password !== this.confirmPassword) {
      this.presentToast(passwordMatch);
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
            412: () => this.presentToast(incorrectLogin),
          },
        )
      : await this.userService.register(
          {
            name: this.name,
            email: this.email,
            password: this.password,
          },
          {
            406: () => this.presentToast(emailTaken),
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
      const invalidEmail = await this.translate
        .get("pages.auth.error.invalidEmail")
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      const invalidEmailAlert = await this.alertCtrl.create({
        message: invalidEmail,
        buttons: [
          {
            text: okay,
          },
        ],
      });
      invalidEmailAlert.present();
      return;
    }

    const loading = this.loadingService.start();

    const response = await this.userService.forgot({
      email: this.email,
    });

    loading.dismiss();

    if (!response) return;

    const message = await this.translate
      .get("pages.auth.forgot.toast")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const successAlert = await this.alertCtrl.create({
      message,
      buttons: [
        {
          text: okay,
        },
      ],
    });
    successAlert.present();
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
