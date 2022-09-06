import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController, ModalController } from '@ionic/angular';
import {TranslateService} from '@ngx-translate/core';

import { IS_SELFHOST } from 'src/environments/environment';

import { EventService } from '@/services/event.service';
import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { MessagingService } from '@/services/messaging.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { CapabilitiesService } from '@/services/capabilities.service';

@Component({
  selector: 'page-auth',
  templateUrl: 'auth.page.html',
  styleUrls: ['auth.page.scss'],
  providers: [ UserService ]
})
export class AuthPage {
  @Input() startWithRegister: boolean | null;

  showLogin = false;
  redirect: string;

  isSelfHost = IS_SELFHOST;

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

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
    public toastCtrl: ToastController,
    public route: ActivatedRoute,
    public userService: UserService) {

    if (this.route.snapshot.paramMap.get('authType') === AuthType.Register) {
      this.showLogin = false;
    } else {
      this.showLogin = true;
    }

    if (this.route.snapshot.paramMap.get('redirect')) {
      this.redirect = this.route.snapshot.queryParamMap.get('redirect');
    }
  }

  ionViewWillEnter() {
    if (typeof this.startWithRegister === "boolean") this.showLogin = !this.startWithRegister;

    this.modalCtrl.getTop().then((topModal) => {
      this.isInModal = !!topModal;
    });
  }

  async toggleLogin() {
    this.showLogin = !this.showLogin;
  }

  async presentToast(message: string) {
    (await this.toastCtrl.create({
      message,
      duration: 6000
    })).present();
  }

  async auth() {
    const invalidEmail = await this.translate.get('pages.auth.errors.invalidEmail').toPromise();
    const noName = await this.translate.get('pages.auth.errors.noName').toPromise();
    const noPassword = await this.translate.get('pages.auth.errors.noPassword').toPromise();
    const noEmail = await this.translate.get('pages.auth.errors.noEmail').toPromise();
    const passwordLength = await this.translate.get('pages.auth.errors.passwordLength').toPromise();
    const passwordMatch = await this.translate.get('pages.auth.errors.passwordMatch').toPromise();
    const incorrectLogin = await this.translate.get('pages.auth.errors.incorrectLogin').toPromise();
    const emailTaken = await this.translate.get('pages.auth.errors.emailTaken').toPromise();

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

    const response = this.showLogin ? (
      await this.userService.login({
        email: this.email,
        password: this.password
      }, {
        412: () => this.presentToast(incorrectLogin)
      })
    ) : (
      await this.userService.register({
        name: this.name,
        email: this.email,
        password: this.password
      }, {
        406: () => this.presentToast(emailTaken)
      })
    );
    loading.dismiss();
    if (!response.success) return;

    localStorage.setItem('token', response.data.token);
    this.capabilitiesService.updateCapabilities();

    if ('Notification' in window && (Notification as any).permission === 'granted') {
      this.messagingService.requestNotifications();
    }

    this.events.publish('auth');
    this.close();
  }

  async forgotPassword() {
    this.email = (document.getElementById('email') as HTMLInputElement).value;
    if (!this.email) {
      const invalidEmail = await this.translate.get('pages.auth.errors.invalidEmail').toPromise();
      this.presentToast(invalidEmail);
      return;
    }

    const loading = this.loadingService.start();

    const response = await this.userService.forgot({
      email: this.email,
    });

    loading.dismiss();

    if (!response) return;

    const message = await this.translate.get('pages.auth.forgot.toast').toPromise();

    const successToast = await this.toastCtrl.create({
      message,
      duration: 7000
    });
    successToast.present();
  }

  showLegal(e) {
    e.preventDefault();
    this.navCtrl.navigateForward(RouteMap.LegalPage.getPath());
  }

  async close() {
    const isInModal = await this.modalCtrl.getTop();
    if (isInModal) {
      await this.modalCtrl.dismiss();
    } else {
      this.navCtrl.navigateRoot(this.redirect || RouteMap.HomePage.getPath('main'));
    }
  }
}
