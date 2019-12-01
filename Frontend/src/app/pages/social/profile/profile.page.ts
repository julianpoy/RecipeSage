import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController, AlertController, NavController } from '@ionic/angular';

import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { RecipeService } from '@/services/recipe.service';

@Component({
  selector: 'page-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss']
})
export class ProfilePage {
  defaultBackHref: string = RouteMap.SocialPage.getPath();

  profile;

  constructor(
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public recipeService: RecipeService,
    public userService: UserService) {

    const loading = this.loadingService.start();

    const username = this.route.snapshot.paramMap.get('username');

    this.userService.profile(username).then(response => {
      loading.dismiss();

      this.profile = response;
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
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

  async sendFriendInvite() {
    const loading = this.loadingService.start();

    this.userService.addFriend(this.profile.id).then(async response => {
      loading.dismiss();

      const tst = await this.toastCtrl.create({
        message: 'Friend invite sent!',
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
        case 404:
          (await this.toastCtrl.create({
            message: 'We\'re having trouble finding that user.',
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

  // async removeFriend() {
  //   const loading = this.loadingService.start();

  //   this.userService.removeFriend(this.profile.id).then(async response => {
  //     loading.dismiss();

  //     const tst = await this.toastCtrl.create({
  //       message: 'Friend invite sent!',
  //       duration: 5000
  //     });
  //     tst.present();
  //   }).catch(async err => {
  //     loading.dismiss();
  //     switch (err.response.status) {
  //       case 0:
  //         (await this.toastCtrl.create({
  //           message: this.utilService.standardMessages.offlinePushMessage,
  //           duration: 5000
  //         })).present();
  //         break;
  //       case 401:
  //         this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
  //         break;
  //       case 404:
  //         (await this.toastCtrl.create({
  //           message: 'We\'re having trouble finding that user.',
  //           duration: 5000
  //         })).present();
  //         break;
  //       default:
  //         const errorToast = await this.toastCtrl.create({
  //           message: this.utilService.standardMessages.unexpectedError,
  //           duration: 30000
  //         });
  //         errorToast.present();
  //         break;
  //     }
  //   });
  // }
}
