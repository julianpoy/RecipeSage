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

  errorMessage: string = '';

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
  }

  ionViewDidLoad() {}

  toggleLogin() {
    this.showLogin = !this.showLogin;

    this.errorMessage = '';
  }

  auth() {
    if (!this.showLogin) this.name = (document.getElementById('name') as HTMLInputElement).value;
    this.email = (document.getElementById('email') as HTMLInputElement).value;
    this.password = (document.getElementById('password') as HTMLInputElement).value;
    if (!this.showLogin) this.confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement).value;

    var emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum)\b/;
    if (!this.showLogin && !emailRegex.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    } else if (!this.showLogin && this.name.length < 1) {
      this.errorMessage = 'Please enter a name (you can enter a nickname!)';
      return;
    } else if (this.password.length === 0) {
      this.errorMessage = 'Please enter a password.';
      return;
    } else if (!this.showLogin && this.password.length < 6) {
      this.errorMessage = 'Please enter a password at least 6 characters long.';
      return;
    } else if (this.email.length === 0) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }

    this.errorMessage = '';

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

        this.navCtrl.setRoot('HomePage', { folder: 'main' }, {animate: true, direction: 'forward'});
      }, err => {
        loading.dismiss();
        switch(err.status) {
          case 0:
            this.errorMessage = 'It looks like you\'re offline right now.';
            break;
          case 404:
            this.errorMessage = 'I can\'t find an account with that email address.';
            break;
          case 401:
            this.errorMessage = 'That password doesn\'t match the email address you entered.';
            break;
          default:
            this.errorMessage = this.utilService.standardMessages.unexpectedError;
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

          this.navCtrl.setRoot('HomePage', { folder: 'main' }, {animate: true, direction: 'forward'});
        }, err => {
          loading.dismiss();
          switch(err.status) {
            case 0:
              this.errorMessage = 'It looks like you\'re offline right now.';
              break;
            case 412:
              this.errorMessage = 'Please enter an email address.';
              break;
            case 406:
              this.errorMessage = 'An account with that email address already exists.';
              break;
            default:
              this.errorMessage = this.utilService.standardMessages.unexpectedError;
              break;
          }
        });
      } else {
        loading.dismiss();
        this.errorMessage = 'The password and confirmation you entered do not match.';
      }
    }
  }

  forgotPassword() {
    this.email = (document.getElementById('email') as HTMLInputElement).value;
    if (!this.email) {
      this.errorMessage = 'Please enter your account email and try again';
      return;
    }

    var loading = this.loadingService.start();

    console.log("calling!")

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
          this.errorMessage = 'It looks like you\'re offline right now.';
          break;
        default:
          this.errorMessage = this.utilService.standardMessages.unexpectedError;
          break;
      }
    });
  }
}
