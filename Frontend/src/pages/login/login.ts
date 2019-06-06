import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController } from 'ionic-angular';

import { UserServiceProvider } from '../../providers/user-service/user-service';
import { LoadingServiceProvider } from '../../providers/loading-service/loading-service';
import { MessagingServiceProvider } from '../../providers/messaging-service/messaging-service';
import { UtilServiceProvider } from '../../providers/util-service/util-service';

@IonicPage({
  priority: 'high'
})
@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
  providers: [ UserServiceProvider ]
})
export class LoginPage {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';

  showLogin: boolean = true;

  redirect: { page: string, params: any };
  afterAuth: Function;

  constructor(
    public navCtrl: NavController,
    public utilService: UtilServiceProvider,
    public loadingService: LoadingServiceProvider,
    public messagingService: MessagingServiceProvider,
    public toastCtrl: ToastController,
    public navParams: NavParams,
    public userService: UserServiceProvider) {

    if (navParams.get('register')) {
      this.showLogin = false;
    }

    if (navParams.get('redirect')) {
      this.redirect = navParams.get('redirect');
    }

    if (navParams.get('afterAuth')) {
      this.afterAuth = navParams.get('afterAuth');
    }
  }

  ionViewDidLoad() {}

  toggleLogin() {
    this.showLogin = !this.showLogin;
  }

  presentToast(msg) {
    this.toastCtrl.create({
      message: msg,
      duration: 6000
    }).present();
  }

  auth() {
    if (!this.showLogin) this.name = (document.getElementById('name') as HTMLInputElement).value;
    this.email = (document.getElementById('email') as HTMLInputElement).value;
    this.password = (document.getElementById('password') as HTMLInputElement).value;
    if (!this.showLogin) this.confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;

    let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.showLogin && !emailRegex.test(this.email)) {
      this.presentToast('Please enter a valid email address.')
      return;
    }
    if (!this.showLogin && this.name.length < 1) {
      this.presentToast('Please enter a name (you can enter a nickname!)')
      return;
    }
    if (this.password.length === 0) {
      this.presentToast('Please enter a password.')
      return;
    }
    if (!this.showLogin && this.password.length < 6) {
      this.presentToast('Please enter a password at least 6 characters long.')
      return;
    }
    if (this.email.length === 0) {
      this.presentToast('Please enter your email address.')
      return;
    }

    var loading = this.loadingService.start();

    if (this.showLogin) {
      this.userService.login({
        email: this.email,
        password: this.password
      }).subscribe(response => {
        loading.dismiss();

        localStorage.setItem('token', response.token);

        if ('Notification' in window && (<any>Notification).permission === 'granted') {
          this.messagingService.requestNotifications();
        }

        this.handleRedirect();
      }, err => {
        loading.dismiss();
        switch(err.status) {
          case 0:
            this.presentToast('It looks like you\'re offline right now.')
            break;
          case 412:
            this.presentToast('It looks like that email or password isn\'t correct.')
            break;
          default:
            this.presentToast(this.utilService.standardMessages.unexpectedError)
            break;
        }
      });
    } else {
      if (this.password === this.confirmPassword) {
        this.userService.register({
          name: this.name,
          email: this.email,
          password: this.password
        }).subscribe(response => {
          loading.dismiss();

          localStorage.setItem('token', response.token);

          if ('Notification' in window && (<any>Notification).permission === 'granted') {
            this.messagingService.requestNotifications();
          }

          this.handleRedirect();
        }, err => {
          loading.dismiss();
          switch(err.status) {
            case 0:
              this.presentToast('It looks like you\'re offline right now.')
              break;
            case 412:
              this.presentToast('Please enter an email address.')
              break;
            case 406:
              this.presentToast('An account with that email address already exists.')
              break;
            default:
              this.presentToast(this.utilService.standardMessages.unexpectedError)
              break;
          }
        });
      } else {
        loading.dismiss();
        this.presentToast('The password and confirmation you entered do not match.')
      }
    }
  }

  forgotPassword() {
    this.email = (document.getElementById('email') as HTMLInputElement).value;
    if (!this.email) {
      this.presentToast('Please enter your account email and try again')
      return;
    }

    var loading = this.loadingService.start();

    this.userService.forgot({
      email: this.email
    }).subscribe(response => {
      loading.dismiss();

      let successToast = this.toastCtrl.create({
        message: 'If there is a RecipeSage account associated with that email address, you should receive a password reset link within the next few minutes.',
        duration: 7000
      });
      successToast.present();
    }, err => {
      loading.dismiss();
      switch (err.status) {
        case 0:
          this.presentToast('It looks like you\'re offline right now.')
          break;
        default:
          this.presentToast(this.utilService.standardMessages.unexpectedError)
          break;
      }
    });
  }

  showLegal(e) {
    e.preventDefault();
    this.navCtrl.push('LegalPage');
  }

  handleRedirect() {
    if (this.afterAuth) {
      this.afterAuth();
    } else {
      let redirectPage = this.redirect ? this.redirect.page : 'HomePage';
      let redirectParams = this.redirect ? this.redirect.params : { folder: 'main' };
      this.navCtrl.setRoot(redirectPage, redirectParams, { animate: true, direction: 'forward' });
    }
  }
}
