import { Component } from '@angular/core';
import { ToastController, AlertController, ModalController, NavController } from '@ionic/angular';

import { isHandleValid } from '../../../../../../SharedUtils/src';

import { AddProfileItemModalPage } from '../add-profile-item-modal/add-profile-item-modal.page';

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

  accountInfo;
  myProfile: UserProfile;
  requiresSetup: boolean = false;

  isHandleAvailable: boolean = true;
  handleInputTimeout;

  updatedProfileFields: Partial<UserProfile> = {};

  constructor(
    public navCtrl: NavController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
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

      this.requiresSetup = !this.myProfile.name || !this.myProfile.handle;
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

  async checkHandleAvailable(handle: string) {
    if (!handle) {
      this.isHandleAvailable = false;
      return;
    }
    const handleInfo = await this.userService.getHandleInfo(handle);
    this.isHandleAvailable = handleInfo?.available;
  }

  handleInput() {
    if (this.handleInputTimeout) clearTimeout(this.handleInputTimeout);
    if (this.updatedProfileFields.handle?.startsWith('@')) this.updatedProfileFields.handle = this.updatedProfileFields.handle.substring(1);
    if (!this.isHandleValid()) return;
    this.handleInputTimeout = setTimeout(() => this.checkHandleAvailable(this.updatedProfileFields.handle), 500);
  }

  isHandleValid() {
    return isHandleValid(this.updatedProfileFields.handle);
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
    if (this.updatedProfileFields.handle && !this.isHandleAvailable) return false;
    if (this.updatedProfileFields.handle && !this.isHandleValid()) return false;

    return true;
  }

  async save() {
    const loading = this.loadingService.start();
    const update = {
      name: this.updatedProfileFields.name,
      handle: this.updatedProfileFields.handle,
      enableProfile: this.updatedProfileFields.enableProfile,
    } as any

    if (this.updatedProfileFields.profileImages) {
      update.profileImageIds = this.updatedProfileFields.profileImages.map(image => image.id);
    }

    if (this.updatedProfileFields.profileItems) {
      update.profileItems = this.updatedProfileFields.profileItems.map(profileItem => ({
        title: profileItem.title,
        visibility: profileItem.visibility,
        type: profileItem.type,
        labelId: profileItem.label?.id || null,
        recipeId: profileItem.recipe?.id || null,
      }));
    }

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
    const modal = await this.modalCtrl.create({
      component: AddProfileItemModalPage,
    });
    modal.present();
    const { data } = await modal.onDidDismiss();

    if (data?.item) {
      this.myProfile.profileItems.push(data.item);
      this.updatedProfileFields.profileItems = this.myProfile.profileItems;

      this.markAsDirty();
    }
  }

  open(item) {
    if(item.type === "all-recipes") {
      this.navCtrl.navigateForward(RouteMap.HomePage.getPath('main', { userId: item.userId }));
    } else if(item.type === "label") {
      this.navCtrl.navigateForward(RouteMap.HomePage.getPath('main', { userId: item.userId, selectedLabels: [item.labelId] }));
    } else if (item.type === "recipe") {
      this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(item.recipe.id));
    }
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
