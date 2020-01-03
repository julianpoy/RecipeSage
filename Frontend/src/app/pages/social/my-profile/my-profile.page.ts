import { Component } from '@angular/core';
import { ToastController, AlertController, NavController } from '@ionic/angular';

import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { RecipeService } from '@/services/recipe.service';

@Component({
  selector: 'page-my-profile',
  templateUrl: 'my-profile.page.html',
  styleUrls: ['my-profile.page.scss']
})
export class MyProfilePage {
  defaultBackHref: string = RouteMap.PeoplePage.getPath();

  accountProfile;

  constructor(
    public navCtrl: NavController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public recipeService: RecipeService,
    public userService: UserService) {

    this.load();
  }

  load() {
    const loading = this.loadingService.start();

    this.userService.myProfile().then(response => {
      loading.dismiss();

      this.accountProfile = response;
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

  // recipeLink(recipeId: string) {
  //   return RouteMap.RecipePage.getPath(recipeId);
  // }

  // labelLink(labelId: string) {
  //   return RouteMap.HomePage.getPath('main', {
  //     userId: 
  //   });
  // }
}
