import { Component } from '@angular/core';
import { ToastController, AlertController, NavController } from '@ionic/angular';

import { UserService, UserProfile } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { RecipeService } from '@/services/recipe.service';
import { ImageService } from '@/services/image.service';
import { UnsavedChangesService } from '@/services/unsaved-changes.service';

@Component({
  selector: 'page-my-profile',
  templateUrl: 'my-profile.page.html',
  styleUrls: ['my-profile.page.scss']
})
export class MyProfilePage {
  defaultBackHref: string = RouteMap.PeoplePage.getPath();

  revealNameInput;
  revealHandleInput;

  accountInfo;
  myProfile: UserProfile;

  updatedProfileFields: Partial<UserProfile> = {};

  constructor(
    public navCtrl: NavController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public unsavedChangesService: UnsavedChangesService,
    public imageService: ImageService,
    public recipeService: RecipeService,
    public userService: UserService) {

    this.load();
  }

  load() {
    const loading = this.loadingService.start();

    Promise.all([
      this.userService.me(),
      this.userService.getMyProfile()
    ]).then(([accountInfo, myProfile]) => {
      loading.dismiss();

      this.accountInfo = accountInfo;
      this.myProfile = myProfile;

      this.revealNameInput = !this.myProfile.name;
      this.revealHandleInput = !this.myProfile.handle;
      if (!this.myProfile.name) this.updatedProfileFields.name = "";
      if (!this.myProfile.handle) this.updatedProfileFields.handle = "";
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

  markAsDirty() {
    this.unsavedChangesService.setPendingChanges();
  }

  markAsClean() {
    this.unsavedChangesService.clearPendingChanges();
  }

  isUpdatePending() {
    return Object.keys(this.updatedProfileFields).length > 0;
  }

  inputIsValid() {
    if (this.updatedProfileFields.name === "") return false;
    if (this.updatedProfileFields.handle === "") return false;

    return true;
  }

  async save() {
    const loading = this.loadingService.start();
    const update = {
      name: this.updatedProfileFields.name,
      handle: this.updatedProfileFields.handle,
      enableProfile: this.updatedProfileFields.enableProfile,
      profileImageIds: this.updatedProfileFields.profileImages.map(image => image.id)
    };
    console.log("updating", update)
    const updated = await this.userService.updateMyProfile(update);
    loading.dismiss();
    if (updated) {
      this.updatedProfileFields = {};
      this.markAsClean();
      this.load();
    }
  }

  async startNewProfileItem() {

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
