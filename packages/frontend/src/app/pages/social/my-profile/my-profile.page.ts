import { Component } from "@angular/core";
import {
  ToastController,
  AlertController,
  ModalController,
  NavController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { isHandleValid } from "@recipesage/util";

import { AddProfileItemModalPage } from "../add-profile-item-modal/add-profile-item-modal.page";
import { ShareProfileModalPage } from "../share-profile-modal/share-profile-modal.page";

import {
  UserService,
  UserProfile,
  User,
  ProfileItem,
} from "~/services/user.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";
import { RecipeService } from "~/services/recipe.service";
import { ImageService } from "~/services/image.service";
import { UnsavedChangesService } from "~/services/unsaved-changes.service";

@Component({
  selector: "page-my-profile",
  templateUrl: "my-profile.page.html",
  styleUrls: ["my-profile.page.scss"],
})
export class MyProfilePage {
  defaultBackHref: string = RouteMap.PeoplePage.getPath();

  revealNameInput: boolean = false;
  revealHandleInput: boolean = false;

  accountInfo?: User;
  myProfile?: UserProfile;
  requiresSetup = false;

  isHandleAvailable = true;
  handleInputTimeout?: NodeJS.Timeout;

  updatedProfileFields: Partial<UserProfile> = {};

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public unsavedChangesService: UnsavedChangesService,
    public imageService: ImageService,
    public recipeService: RecipeService,
    public userService: UserService,
  ) {
    this.load().then(() => {
      this.checkProfileEnabled();
    });
  }

  async load() {
    const loading = this.loadingService.start();

    const [accountInfo, myProfile] = await Promise.all([
      this.userService.me({
        401: () =>
          this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login)),
      }),
      this.userService.getMyProfile({
        401: () =>
          this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login)),
      }),
    ]);
    loading.dismiss();

    if (!accountInfo.success || !myProfile.success) return;

    this.accountInfo = accountInfo.data;
    this.myProfile = myProfile.data;

    this.requiresSetup = !this.myProfile.name || !this.myProfile.handle;

    if (this.requiresSetup) {
      this.updatedProfileFields.enableProfile = true;
    }
  }

  async checkProfileEnabled() {
    if (
      this.myProfile &&
      this.myProfile.handle &&
      this.myProfile.name &&
      !this.myProfile.enableProfile
    ) {
      const header = await this.translate
        .get("pages.myProfile.notEnabled.header")
        .toPromise();
      const message = await this.translate
        .get("pages.myProfile.notEnabled.message")
        .toPromise();
      const ignore = await this.translate
        .get("pages.myProfile.ignore")
        .toPromise();
      const enable = await this.translate
        .get("pages.myProfile.enable")
        .toPromise();

      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: ignore,
            role: "cancel",
            handler: () => {},
          },
          {
            text: enable,
            handler: () => {
              this.updatedProfileFields.enableProfile = true;
              if (this.myProfile && this.accountInfo) {
                this.myProfile.enableProfile = true;
                this.accountInfo.enableProfile = true;
              }

              this.markAsDirty();
            },
          },
        ],
      });
      alert.present();
    }
  }

  async checkHandleAvailable(handle: string) {
    if (!handle) {
      this.isHandleAvailable = false;
      return;
    }
    const response = await this.userService.getHandleInfo(handle);
    if (!response.success) return;
    this.isHandleAvailable = response.data.available;
  }

  handleInput() {
    if (this.handleInputTimeout) clearTimeout(this.handleInputTimeout);
    if (this.updatedProfileFields.handle?.startsWith("@"))
      this.updatedProfileFields.handle =
        this.updatedProfileFields.handle.substring(1);
    if (!this.isHandleValid()) return;

    this.handleInputTimeout = setTimeout(
      () => this.checkHandleAvailable(this.updatedProfileFields.handle || ""),
      500,
    );
  }

  isHandleValid() {
    return isHandleValid(this.updatedProfileFields.handle || "");
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
    if (this.updatedProfileFields.handle && !this.isHandleAvailable)
      return false;
    if (this.updatedProfileFields.handle && !this.isHandleValid()) return false;

    return true;
  }

  async save() {
    const loading = this.loadingService.start();
    const update = {
      name: this.updatedProfileFields.name,
      handle: this.updatedProfileFields.handle,
      enableProfile: this.updatedProfileFields.enableProfile,
    } as any;

    if (this.updatedProfileFields.profileImages) {
      update.profileImageIds = this.updatedProfileFields.profileImages.map(
        (image) => image.id,
      );
    }

    if (this.updatedProfileFields.profileItems) {
      update.profileItems = this.updatedProfileFields.profileItems.map(
        (profileItem) => ({
          title: profileItem.title,
          visibility: profileItem.visibility,
          type: profileItem.type,
          labelId: profileItem.label?.id || null,
          recipeId: profileItem.recipe?.id || null,
        }),
      );
    }

    console.log("updating", update);
    const updated = await this.userService.updateMyProfile(update);
    loading.dismiss();
    if (updated) {
      this.updatedProfileFields = {};
      this.markAsClean();
      await this.load();
    }
  }

  async startNewProfileItem() {
    if (!this.myProfile) return;

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

  async removeProfileItem(idx: number) {
    if (!this.myProfile) return;

    this.myProfile.profileItems.splice(idx, 1);
    this.updatedProfileFields.profileItems = this.myProfile.profileItems;

    this.markAsDirty();
  }

  async shareProfile() {
    if (Object.keys(this.updatedProfileFields).length > 0) {
      const header = await this.translate
        .get("pages.myProfile.share.unsaved.header")
        .toPromise();
      const message = await this.translate
        .get("pages.myProfile.share.unsaved.message")
        .toPromise();
      const cancel = await this.translate.get("generic.cancel").toPromise();
      const save = await this.translate.get("generic.save").toPromise();

      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: cancel,
            role: "cancel",
            handler: () => {},
          },
          {
            text: save,
            handler: async () => {
              await this.save();
              this.shareProfile();
            },
          },
        ],
      });
      alert.present();
      return;
    }
    if (!this.myProfile?.enableProfile) {
      this.checkProfileEnabled();
      return;
    }
    const modal = await this.modalCtrl.create({
      component: ShareProfileModalPage,
      componentProps: {
        profile: this.myProfile,
      },
    });
    modal.present();
  }

  async viewProfile() {
    if (Object.keys(this.updatedProfileFields).length > 0) {
      const header = await this.translate
        .get("pages.myProfile.view.unsaved.header")
        .toPromise();
      const message = await this.translate
        .get("pages.myProfile.view.unsaved.message")
        .toPromise();
      const cancel = await this.translate.get("generic.cancel").toPromise();
      const save = await this.translate.get("generic.save").toPromise();

      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: cancel,
            role: "cancel",
            handler: () => {},
          },
          {
            text: save,
            handler: async () => {
              await this.save();
              this.viewProfile();
            },
          },
        ],
      });
      alert.present();
      return;
    }
    if (!this.myProfile?.enableProfile) {
      this.checkProfileEnabled();
      return;
    }
    this.navCtrl.navigateForward(
      RouteMap.ProfilePage.getPath(`@${this.myProfile.handle}`),
    );
  }

  open(item: any) {
    if (item.type === "all-recipes") {
      this.navCtrl.navigateForward(
        RouteMap.HomePage.getPath("main", { userId: item.userId }),
      );
    } else if (item.type === "label") {
      this.navCtrl.navigateForward(
        RouteMap.HomePage.getPath("main", {
          userId: item.userId,
          selectedLabels: [item.label.title],
        }),
      );
    } else if (item.type === "recipe") {
      this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(item.recipe.id));
    }
  }

  ionReorder(event: any) {
    if (!this.myProfile) return false;

    const item = this.myProfile.profileItems.splice(event.detail.from, 1)?.[0];
    if (item) {
      this.myProfile.profileItems.splice(event.detail.to, 0, item);
      this.updatedProfileFields.profileItems = this.myProfile.profileItems;
    }

    event.detail.complete(!!item);
  }
}
