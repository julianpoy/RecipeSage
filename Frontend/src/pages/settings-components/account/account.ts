import { Component } from '@angular/core';
import { IonicPage, ToastController, AlertController, NavController, NavParams } from 'ionic-angular';

import { UserServiceProvider } from '../../../providers/user-service/user-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';
import { RecipeServiceProvider } from '../../../providers/recipe-service/recipe-service';

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
    public recipeService: RecipeServiceProvider,
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
    if (!this.account.name || this.account.name.length === 0) {
      this.toastCtrl.create({
        message: "Name/nickname must not be blank.",
        duration: 5000
      }).present();
      return;
    }

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
    if (!this.account.email || this.account.email.length === 0) {
      this.toastCtrl.create({
        message: "Email must not be blank.",
        duration: 5000
      }).present();
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
        case 406:
          this.toastCtrl.create({
            message: 'Sorry, an account with that email address already exists.',
            duration: 5000
          }).present();
          break;
        case 412:
          this.toastCtrl.create({
            message: 'Please enter a valid email address.',
            duration: 5000
          }).present();
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
    }

    var loading = this.loadingService.start();

    this.userService.update({
      password: this.account.password
    }).subscribe(response => {
      loading.dismiss();

      this.account.password = '*'.repeat(this.account.password.length);
      this.passwordChanged = false;

      this._logout();
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
        case 412:
          this.toastCtrl.create({
            message: 'Invalid password - Passwords must be 6 characters or longer.',
            duration: 5000
          }).present();
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

  deleteAllRecipes() {
    let alert = this.alertCtrl.create({
      title: 'Warning - You\'re about to delete all of your recipes!',
      message: `This action is PERMANENT.<br /><br />All of your recipes and associated labels will be removed from the Recipe Sage system.`,
      buttons: [
        {
          text: 'Yes, continue',
          handler: () => {
            let loading = this.loadingService.start();

            this.recipeService.removeAll().subscribe(() => {
              loading.dismiss();

              this.toastCtrl.create({
                message: 'Your recipe data has been deleted.',
                duration: 5000
              }).present();
            }, err => {
              loading.dismiss();

              switch (err.status) {
                case 0:
                  this.toastCtrl.create({
                    message: this.utilService.standardMessages.offlinePushMessage,
                    duration: 5000
                  }).present();
                  break;
                case 401:
                  this.toastCtrl.create({
                    message: 'It looks like your session has expired. Please login and try again.',
                    duration: 5000
                  }).present();
                  this.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
                  break;
                default:
                  let errorToast = this.toastCtrl.create({
                    message: this.utilService.standardMessages.unexpectedError,
                    duration: 30000
                  });
                  errorToast.present();
                  break;
              }
            })
          }
        },
        {
          text: 'Cancel',
          handler: () => {}
        }
      ]
    });
    alert.present();
  }
}
