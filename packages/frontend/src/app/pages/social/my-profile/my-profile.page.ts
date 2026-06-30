import { Component, inject, effect } from "@angular/core";
import {
  ToastController,
  AlertController,
  ModalController,
  NavController,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { isHandleValid } from "@recipesage/util/shared";

import { AddProfileItemModalPage } from "../add-profile-item-modal/add-profile-item-modal.page";
import { ShareProfileModalPage } from "../share-profile-modal/share-profile-modal.page";

import { ServerActionsService } from "../../../services/server-actions.service";
import type {
  RouterInputs,
  RouterOutputs,
} from "../../../services/server-actions/actions-base";
import type { ImageSummary, ProfileItemSummary } from "@recipesage/prisma";
import { LoadingService } from "../../../services/loading.service";
import {
  UtilService,
  RouteMap,
  AuthType,
} from "../../../services/util.service";
import { ImageService } from "../../../services/image.service";
import { UnsavedChangesService } from "../../../services/unsaved-changes.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import { MultiImageUploadComponent } from "../../../components/multi-image-upload/multi-image-upload.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonItem,
  IonInput,
  IonLabel,
  IonIcon,
  IonToggle,
  IonButton,
  IonList,
  IonReorderGroup,
  IonReorder,
  IonAvatar,
  IonFooter,
  IonSpinner,
} from "@ionic/angular/standalone";
import {
  addOutline,
  arrowForwardOutline,
  bookmarksOutline,
  folderOutline,
  keyOutline,
  pencilOutline,
  pricetagOutline,
  shareSocialOutline,
  trashOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

type ProfileFormItem = Omit<ProfileItemSummary, "id" | "userId" | "order">;

interface ProfileForm {
  id: string;
  name: string;
  handle: string | null;
  enableProfile: boolean;
  profileImages: ImageSummary[];
  profileItems: ProfileFormItem[];
}

@Component({
  standalone: true,
  selector: "page-my-profile",
  templateUrl: "my-profile.page.html",
  styleUrls: ["my-profile.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    NullStateComponent,
    MultiImageUploadComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonLabel,
    IonIcon,
    IonToggle,
    IonButton,
    IonList,
    IonReorderGroup,
    IonReorder,
    IonAvatar,
    IonFooter,
    IonSpinner,
  ],
})
export class MyProfilePage {
  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  toastCtrl = inject(ToastController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  unsavedChangesService = inject(UnsavedChangesService);
  imageService = inject(ImageService);
  serverActionsService = inject(ServerActionsService);

  defaultBackHref: string = RouteMap.PeoplePage.getPath();

  revealNameInput: boolean = false;
  revealHandleInput: boolean = false;

  private meQuery = this.serverActionsService.users.getMe({
    401: () =>
      this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login)),
  });
  me = this.meQuery.value;

  myProfile?: ProfileForm;
  requiresSetup = false;
  private hasCheckedProfileEnabled = false;

  checkingHandleAvailable = false;
  isHandleAvailable = true;
  handleInputTimeout?: NodeJS.Timeout;

  updatedProfileFields: Partial<ProfileForm> = {};

  constructor() {
    addIcons({
      addOutline,
      arrowForwardOutline,
      bookmarksOutline,
      folderOutline,
      keyOutline,
      pencilOutline,
      pricetagOutline,
      shareSocialOutline,
      trashOutline,
    });
    effect(() => {
      const me = this.me();
      if (!me) return;
      if (this.isUpdatePending()) return;
      this.seedForm(me);
    });
  }

  private async seedForm(me: RouterOutputs["users"]["getMe"]) {
    this.myProfile = {
      id: me.id,
      name: me.name,
      handle: me.handle,
      enableProfile: me.enableProfile,
      profileImages: me.profileImages.map((profileImage) => profileImage.image),
      profileItems: this.myProfile?.profileItems ?? [],
    };

    this.requiresSetup = !this.myProfile.name || !this.myProfile.handle;

    if (this.requiresSetup) {
      this.updatedProfileFields.enableProfile = true;
    }

    const profileItems =
      await this.serverActionsService.users.getVisibleUserProfileItems({
        userId: me.id,
      });
    if (this.myProfile) {
      this.myProfile.profileItems = profileItems ?? [];
    }

    if (!this.hasCheckedProfileEnabled) {
      this.hasCheckedProfileEnabled = true;
      this.checkProfileEnabled();
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
              if (this.myProfile) {
                this.myProfile.enableProfile = true;
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
    const response = await this.serverActionsService.users.getIsHandleAvailable(
      {
        handle,
      },
    );
    if (!response) return;
    this.isHandleAvailable = response.available;
  }

  handleInput() {
    if (this.handleInputTimeout) clearTimeout(this.handleInputTimeout);
    if (this.updatedProfileFields.handle?.startsWith("@"))
      this.updatedProfileFields.handle =
        this.updatedProfileFields.handle.substring(1);
    if (!this.isHandleValid()) return;

    this.checkingHandleAvailable = true;
    this.handleInputTimeout = setTimeout(() => {
      this.checkHandleAvailable(this.updatedProfileFields.handle || "");
      this.checkingHandleAvailable = false;
    }, 250);
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
    if (this.requiresSetup && !this.myProfile?.handle) return false;
    if (this.checkingHandleAvailable) return false;

    if (this.updatedProfileFields.handle && !this.isHandleAvailable)
      return false;
    if (this.updatedProfileFields.handle && !this.isHandleValid()) return false;

    return true;
  }

  async save() {
    const loading = this.loadingService.start();
    const update: RouterInputs["users"]["updateMyProfile"] = {
      name: this.updatedProfileFields.name,
      handle: this.updatedProfileFields.handle ?? undefined,
      enableProfile: this.updatedProfileFields.enableProfile,
    };

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

    const updated =
      await this.serverActionsService.users.updateMyProfile(update);
    loading.dismiss();
    if (updated) {
      this.updatedProfileFields = {};
      this.markAsClean();
      this.meQuery.refresh();
    }
  }

  async startNewProfileItem() {
    if (!this.myProfile) return;

    const modal = await this.modalCtrl.create({
      component: AddProfileItemModalPage,
    });
    modal.present();
    const { data } = await modal.onDidDismiss<{
      item: ProfileFormItem;
    }>();

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
        profile: this.me(),
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

  open(item: ProfileFormItem) {
    if (!this.myProfile) return;
    const userId = this.myProfile.id;

    if (item.type === "all-recipes") {
      this.navCtrl.navigateForward(
        RouteMap.HomePage.getPath("main", { userId }),
      );
    } else if (item.type === "label" && item.label) {
      this.navCtrl.navigateForward(
        RouteMap.HomePage.getPath("main", {
          userId,
          selectedLabels: [item.label.title],
        }),
      );
    } else if (item.type === "recipe" && item.recipe) {
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
