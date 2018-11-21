import { Component } from '@angular/core';
import { IonicPage, ToastController, AlertController, NavController, NavParams } from 'ionic-angular';

import { UserServiceProvider } from '../../../providers/user-service/user-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-account',
  templateUrl: 'account.html',
})
export class AccountPage {

  account: any = {
    password: "123456"
  };

  nameChanged: boolean = false;
  emailChanged: boolean = false;
  passwordChanged: boolean = false;

  constructor(
    public navCtrl: NavController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    public utilService: UtilServiceProvider,
    public loadingService: LoadingServiceProvider,
    public userService: UserServiceProvider) {

    var loading = this.loadingService.start();

    this.userService.me().subscribe(response => {
      loading.dismiss();

      this.account = response;
    }, err => {
      loading.dismiss();
      switch(err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  ionViewDidLoad() {}

  saveName() {
    var loading = this.loadingService.start();

    this.userService.update({
      name: this.account.name
    }).subscribe(response => {
      loading.dismiss();

      this.account.name = response.name;
      this.nameChanged = false;

      let tst = this.toastCtrl.create({
        message: 'Profile name was updated.',
        duration: 5000
      });
      tst.present();
    }, err => {
      loading.dismiss();
      switch(err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  saveEmail() {
    var emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum)\b/;
    if (this.account.email.length === 0 || !emailRegex.test(this.account.email)) {
      let tst = this.toastCtrl.create({
        message: 'Please enter a valid email address.',
        duration: 5000
      });
      tst.present();
      return;
    }

    var loading = this.loadingService.start();

    this.userService.update({
      email: this.account.email
    }).subscribe(response => {
      loading.dismiss();

      this.account.email = response.email;
      this.emailChanged = false;

      let tst = this.toastCtrl.create({
        message: 'Email address was updated.',
        duration: 5000
      });
      tst.present();
    }, err => {
      loading.dismiss();
      switch(err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  _logout() {
    localStorage.removeItem('token');

    let alert = this.alertCtrl.create({
      title: 'Password Updated',
      message: 'Your password has been updated. You will need to log back in on any devices that use this account.',
      buttons: [
        {
          text: 'Okay',
          handler: () => {
            this.navCtrl.setRoot('LoginPage', {});
          }
        }
      ]
    });
    alert.present();
  }

  savePassword() {
    if (this.account.password !== this.account.confirmPassword) {
      let tst = this.toastCtrl.create({
        message: 'Passwords do not match.',
        duration: 5000
      });
      tst.present();
      return;
    } else if (this.account.password.length < 6) {
      let tst = this.toastCtrl.create({
        message: 'Password must be 6 characters or longer.',
        duration: 5000
      });
      tst.present();
      return;
    }

    var loading = this.loadingService.start();

    this.userService.update({
      password: this.account.password
    }).subscribe(response => {

      this.account.password = '*'.repeat(this.account.password.length);
      this.passwordChanged = false;

      this.userService.logout().subscribe(response => {
        loading.dismiss();

        this._logout();
      }, err => {
        loading.dismiss();
        switch (err.status) {
          case 0:
          case 401:
          case 404:
            this._logout();
            break;
          default:
            this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 6000
            }).present();
            break;
        }
      });
    }, err => {
      loading.dismiss();
      switch(err.status) {
        case 0:
          this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          }).present();
          break;
        case 401:
          this.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }
}
