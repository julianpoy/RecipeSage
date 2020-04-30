import { Component } from '@angular/core';
import { ToastController, AlertController, NavController } from '@ionic/angular';

import dayjs, { Dayjs } from 'dayjs';

import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { RecipeService } from '@/services/recipe.service';
import { CapabilitiesService } from '@/services/capabilities.service';

@Component({
  selector: 'page-account',
  templateUrl: 'account.page.html',
  styleUrls: ['account.page.scss']
})
export class AccountPage {
  defaultBackHref: string = RouteMap.SettingsPage.getPath();
  contributePath: string = RouteMap.ContributePage.getPath();

  account: any = {
    password: '123456'
  };

  stats: any = {};

  nameChanged = false;
  emailChanged = false;
  passwordChanged = false;

  capabilitySubscriptions: any = {};

  constructor(
    public navCtrl: NavController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public recipeService: RecipeService,
    public userService: UserService,
    public capabilitiesService: CapabilitiesService) {

    const loading = this.loadingService.start();

    Promise.all([
      this.userService.me(),
      this.userService.myStats(),
      this.capabilitiesService.updateCapabilities()
    ]).then(([account, stats]) => {
      loading.dismiss();

      this.account = account;
      this.account.password = '123456';

      this.stats = stats;
      this.stats.createdAt = this.utilService.formatDate(stats.createdAt, { now: true });
      this.stats.lastLogin = stats.lastLogin ? this.utilService.formatDate(stats.lastLogin, { now: true }) : this.stats.createdAt;

      Object.keys(this.capabilitiesService.capabilities).map(capabilityName => {
        this.capabilitySubscriptions[capabilityName] = {
          enabled: this.capabilitiesService.capabilities[capabilityName],
          expires: this.getExpiryForCapability(capabilityName)
        };
      });
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 401:
          this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
          break;
        default:
          const errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  getSubscriptionForCapability(capabilityName: string) {
    if (!this.account || !this.account.subscriptions) return null;

    try {
      const matchingSubscriptions = this.account.subscriptions
        .filter(subscription => subscription.capabilities.includes(capabilityName))
        .sort((a, b) => {
          if (a.expires == null) return -1;
          if (b.expires == null) return 1;
          return new Date(a.expires) < new Date(b.expires);
        });
      if (matchingSubscriptions) return matchingSubscriptions[0];
    } catch (e) {
      console.error(e);
    }
  }

  getExpiryForCapability(capabilityName: string) {
    const subscription = this.getSubscriptionForCapability(capabilityName);
    if (!subscription) return -1;
    if (!subscription.expires) return false;

    const expires = new Date(subscription.expires);
    return `${new Date(subscription.expires) < new Date() ? 'Expired ' : 'Enabled until '}${dayjs(expires).format('YYYY-MM-DD')}`;
  }

  async saveName() {
    if (!this.account.name || this.account.name.length === 0) {
      const errorToast = await this.toastCtrl.create({
        message: 'Name/nickname must not be blank.',
        duration: 5000
      });
      errorToast.present();
      return;
    }

    const loading = this.loadingService.start();

    this.userService.update({
      name: this.account.name
    }).then(async response => {
      loading.dismiss();

      this.account.name = response.name;
      this.nameChanged = false;

      const tst = await this.toastCtrl.create({
        message: 'Profile name was updated.',
        duration: 5000
      });
      tst.present();
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 401:
          this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
          break;
        default:
          const errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  async saveEmail() {
    if (!this.account.email || this.account.email.length === 0) {
      (await this.toastCtrl.create({
        message: 'Email must not be blank.',
        duration: 5000
      })).present();
      return;
    }

    const loading = this.loadingService.start();

    this.userService.update({
      email: this.account.email
    }).then(async response => {
      loading.dismiss();

      this.account.email = response.email;
      this.emailChanged = false;

      const tst = await this.toastCtrl.create({
        message: 'Email address was updated.',
        duration: 5000
      });
      tst.present();
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 401:
          this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
          break;
        case 406:
          (await this.toastCtrl.create({
            message: 'Sorry, an account with that email address already exists.',
            duration: 5000
          })).present();
          break;
        case 412:
          (await this.toastCtrl.create({
            message: 'Please enter a valid email address.',
            duration: 5000
          })).present();
          break;
        default:
          const errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  async _logout() {
    localStorage.removeItem('token');

    const alert = await this.alertCtrl.create({
      header: 'Password Updated',
      message: 'Your password has been updated. You will need to log back in on any devices that use this account.',
      buttons: [
        {
          text: 'Okay',
          handler: () => {
            this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
          }
        }
      ]
    });
    alert.present();
  }

  async savePassword() {
    if (this.account.password !== this.account.confirmPassword) {
      const tst = await this.toastCtrl.create({
        message: 'Passwords do not match.',
        duration: 5000
      });
      tst.present();
      return;
    }

    const loading = this.loadingService.start();

    this.userService.update({
      password: this.account.password
    }).then(response => {
      loading.dismiss();

      this.account.password = '*'.repeat(this.account.password.length);
      this.passwordChanged = false;

      this._logout();
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 401:
          this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
          break;
        case 412:
          (await this.toastCtrl.create({
            message: 'Invalid password - Passwords must be 6 characters or longer.',
            duration: 5000
          })).present();
          break;
        default:
          const errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  async deleteAllRecipes() {
    const alert = await this.alertCtrl.create({
      header: 'Warning - You\'re about to delete all of your recipes!',
      message: `This action is PERMANENT.<br /><br />
                All of your recipes and associated labels will be removed from the RecipeSage system.`,
      buttons: [
        {
          text: 'Yes, continue',
          cssClass: 'alertDanger',
          handler: () => {
            const loading = this.loadingService.start();

            this.recipeService.removeAll().then(async () => {
              loading.dismiss();

              (await this.toastCtrl.create({
                message: 'Your recipe data has been deleted.',
                duration: 5000
              })).present();
            }).catch(async err => {
              loading.dismiss();

              switch (err.response.status) {
                case 0:
                  (await this.toastCtrl.create({
                    message: this.utilService.standardMessages.offlinePushMessage,
                    duration: 5000
                  })).present();
                  break;
                case 401:
                  (await this.toastCtrl.create({
                    message: 'It looks like your session has expired. Please login and try again.',
                    duration: 5000
                  })).present();
                  this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
                  break;
                default:
                  const errorToast = await this.toastCtrl.create({
                    message: this.utilService.standardMessages.unexpectedError,
                    duration: 30000
                  });
                  errorToast.present();
                  break;
              }
            });
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
