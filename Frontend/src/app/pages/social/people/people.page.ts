import { Component } from '@angular/core';
import { ToastController, AlertController, NavController, ModalController } from '@ionic/angular';

import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { RecipeService } from '@/services/recipe.service';
import { AddFriendModalPage } from '../add-friend-modal/add-friend-modal.page';

@Component({
  selector: 'page-people',
  templateUrl: 'people.page.html',
  styleUrls: ['people.page.scss']
})
export class PeoplePage {
  defaultBackHref: string = RouteMap.SettingsPage.getPath();

  friendships;
  accountInfo;
  myProfile;

  constructor(
    public navCtrl: NavController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public recipeService: RecipeService,
    public userService: UserService) {

    this.load();
  }

  load() {
    const loading = this.loadingService.start();

    Promise.all([
      this.userService.friends(),
      this.userService.me(),
      this.userService.myProfile()
    ]).then(([friendships, accountInfo, myProfile]) => {
      loading.dismiss();

      this.friendships = friendships;
      this.accountInfo = accountInfo;
      this.myProfile = myProfile;
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

  async findProfile() {
    const modal = await this.modalCtrl.create({
      component: AddFriendModalPage
    });
    modal.present();
    modal.onDidDismiss().then(() => {
      this.load();
    });
  }

  async addFriend(friendId) {
    try {
      await this.userService.addFriend(friendId);
      await this.load();
    } catch(err) {
      switch (err.response.status) {
        case 0:
          const offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.modalCtrl.dismiss();
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
    }
  }

  async openProfile(userId) {
    this.navCtrl.navigateForward(RouteMap.ProfilePage.getPath(userId));
  }
}
