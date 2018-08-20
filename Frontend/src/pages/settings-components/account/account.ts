import { Component } from '@angular/core';
import { URLSearchParams } from "@angular/http";
import { IonicPage, ToastController, NavController, NavParams } from 'ionic-angular';

import { UserServiceProvider } from '../../../providers/user-service/user-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';

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
    public navParams: NavParams,
    public loadingService: LoadingServiceProvider,
    public userService: UserServiceProvider) {

    var loading = this.loadingService.start();

    var me = this;
    this.userService.me().subscribe(function(response) {
      loading.dismiss();

      me.account = response;
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 0:
          me.toastCtrl.create({
            message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
            duration: 5000
          }).present();
          break;
        case 401:
          me.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: 'An unexpected error occured. Please restart application.',
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad AccountPage');
  }

  saveName() {
    var loading = this.loadingService.start();

    var me = this;
    this.userService.update({
      name: this.account.name
    }).subscribe(function(response) {
      loading.dismiss();

      me.account.name = response.name;
      me.nameChanged = false;

      let tst = me.toastCtrl.create({
        message: 'Profile name was updated.',
        duration: 5000
      });
      tst.present();
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 0:
          me.toastCtrl.create({
            message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
            duration: 5000
          }).present();
          break;
        case 401:
          me.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: 'An unexpected error occured. Please restart application.',
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

    var me = this;
    this.userService.update({
      email: this.account.email
    }).subscribe(function(response) {
      loading.dismiss();

      me.account.email = response.email;
      me.emailChanged = false;

      let tst = me.toastCtrl.create({
        message: 'Email address was updated.',
        duration: 5000
      });
      tst.present();
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 0:
          me.toastCtrl.create({
            message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
            duration: 5000
          }).present();
          break;
        case 401:
          me.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: 'An unexpected error occured. Please restart application.',
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
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

    var me = this;
    this.userService.update({
      password: this.account.password
    }).subscribe(function(response) {
      loading.dismiss();

      me.account.password = '*'.repeat(me.account.password.length);
      me.passwordChanged = false;

      let tst = me.toastCtrl.create({
        message: 'Password was updated.',
        duration: 5000
      });
      tst.present();
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 0:
          me.toastCtrl.create({
            message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
            duration: 5000
          }).present();
          break;
        case 401:
          me.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: 'An unexpected error occured. Please restart application.',
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }
}
