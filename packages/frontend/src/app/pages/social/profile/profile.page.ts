import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  ToastController,
  AlertController,
  NavController,
  ModalController,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { IS_SELFHOST } from "../../../../environments/environment";

import { ServerActionsService } from "../../../services/server-actions.service";
import type { RouterOutputs } from "../../../services/server-actions/actions-base";
import { LoadingService } from "../../../services/loading.service";
import { UtilService, RouteMap } from "../../../services/util.service";
import { ImageViewerComponent } from "../../../modals/image-viewer/image-viewer.component";
import { NewMessageModalPage } from "../../messaging-components/new-message-modal/new-message-modal.page";
import { ShareProfileModalPage } from "../share-profile-modal/share-profile-modal.page";
import { AuthPage } from "../../auth/auth.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import { SelfhostWarningItemComponent } from "../../../components/selfhost-warning-item/selfhost-warning-item.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonBackButton,
  IonTitle,
  IonContent,
  IonThumbnail,
  IonItem,
  IonIcon,
  IonLabel,
  IonList,
  IonAvatar,
  IonFooter,
  IonButton,
  IonSpinner,
} from "@ionic/angular/standalone";
import {
  bookmarks,
  folder,
  key,
  mail,
  pricetag,
  shareSocial,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-profile",
  templateUrl: "profile.page.html",
  styleUrls: ["profile.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    NullStateComponent,
    SelfhostWarningItemComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonBackButton,
    IonTitle,
    IonContent,
    IonThumbnail,
    IonItem,
    IonIcon,
    IonLabel,
    IonList,
    IonAvatar,
    IonFooter,
    IonButton,
    IonSpinner,
  ],
})
export class ProfilePage {
  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  route = inject(ActivatedRoute);
  toastCtrl = inject(ToastController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  serverActionsService = inject(ServerActionsService);

  defaultBackHref: string = RouteMap.PeoplePage.getPath();
  isSelfHost = IS_SELFHOST;

  handle: string = "";
  profile?: RouterOutputs["users"]["getUserProfileByHandle"];
  profileItems: RouterOutputs["users"]["getVisibleUserProfileItems"] = [];
  incomingFriendship = false;
  outgoingFriendship = false;

  private meQuery = this.serverActionsService.users.getMe({ 401: () => {} });
  me = this.meQuery.value;

  constructor() {
    addIcons({ bookmarks, folder, key, mail, pricetag, shareSocial });
    this.applyRouteParams();
  }

  private applyRouteParams() {
    const handle = this.route.snapshot.paramMap.get("handle")?.substring(1);

    if (!handle) {
      this.navCtrl.navigateRoot(RouteMap.PeoplePage.getPath());
      throw new Error("No handle specified");
    }

    this.handle = handle;
  }

  async profileDisabledError() {
    const header = await this.translate
      .get("pages.profile.disabled.header")
      .toPromise();
    const message = await this.translate
      .get("pages.profile.disabled.message")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: okay,
          handler: () => {
            this.navCtrl.navigateRoot(RouteMap.PeoplePage.getPath());
          },
        },
      ],
    });
    alert.present();
  }

  ionViewWillEnter() {
    const snapshotHandle = this.route.snapshot.paramMap
      .get("handle")
      ?.substring(1);
    if (snapshotHandle && snapshotHandle !== this.handle) {
      this.applyRouteParams();
      this.profile = undefined;
    }

    this.meQuery.refresh();
    this.load();
  }

  async load() {
    const loading = this.loadingService.start();

    const profileResponse =
      await this.serverActionsService.users.getUserProfileByHandle(
        { handle: this.handle },
        {
          404: () => this.profileDisabledError(),
        },
      );

    if (!profileResponse) {
      loading.dismiss();
      return;
    }

    const loggedIn = this.isLoggedIn();
    const [items, friends] = await Promise.all([
      this.serverActionsService.users.getVisibleUserProfileItems({
        userId: profileResponse.id,
      }),
      loggedIn
        ? this.serverActionsService.users.getMyFriends()
        : Promise.resolve(undefined),
    ]);

    loading.dismiss();

    this.profile = profileResponse;
    this.profileItems = items ?? [];

    this.incomingFriendship = false;
    this.outgoingFriendship = false;
    if (friends) {
      const isFriend = friends.friends.some(
        (friend) => friend.id === profileResponse.id,
      );
      this.incomingFriendship =
        isFriend ||
        friends.incomingRequests.some(
          (friend) => friend.id === profileResponse.id,
        );
      this.outgoingFriendship =
        isFriend ||
        friends.outgoingRequests.some(
          (friend) => friend.id === profileResponse.id,
        );
    }
  }

  isMyProfile(): boolean {
    return !!this.profile && this.me()?.id === this.profile.id;
  }

  async openImageViewer() {
    if (!this.profile) return;

    const imageViewerModal = await this.modalCtrl.create({
      component: ImageViewerComponent,
      componentProps: {
        imageUrls: this.profile.profileImages.map(
          (profileImage) => profileImage.image.location,
        ),
      },
    });
    imageViewerModal.present();
  }

  open(item: RouterOutputs["users"]["getVisibleUserProfileItems"][number]) {
    if (item.type === "all-recipes") {
      this.navCtrl.navigateForward(
        RouteMap.HomePage.getPath("main", { userId: item.userId }),
      );
    } else if (item.type === "label" && item.label) {
      this.navCtrl.navigateForward(
        RouteMap.HomePage.getPath("main", {
          userId: item.userId,
          selectedLabels: [item.label.title],
        }),
      );
    } else if (item.type === "recipe" && item.recipe) {
      this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(item.recipe.id));
    }
  }

  async addFriend() {
    if (!this.profile) return;

    const loading = this.loadingService.start();

    await this.serverActionsService.users.createFriendship({
      friendId: this.profile.id,
    });
    loading.dismiss();

    const message = await this.translate
      .get("pages.profile.inviteSent")
      .toPromise();
    const close = await this.translate.get("generic.close").toPromise();

    const tst = await this.toastCtrl.create({
      message,
      duration: 5000,
      buttons: [
        {
          side: "end",
          role: "cancel",
          text: close,
        },
      ],
    });
    tst.present();

    this.load();
  }

  async deleteFriend() {
    if (!this.profile) return;

    const loading = this.loadingService.start();

    await this.serverActionsService.users.deleteFriendship({
      friendId: this.profile.id,
    });
    loading.dismiss();

    const message = await this.translate
      .get("pages.profile.inviteRemoved")
      .toPromise();
    const close = await this.translate.get("generic.close").toPromise();

    const tst = await this.toastCtrl.create({
      message,
      duration: 5000,
      buttons: [
        {
          side: "end",
          role: "cancel",
          text: close,
        },
      ],
    });
    tst.present();

    this.load();
  }

  async shareProfile() {
    if (!this.profile) return;

    const modal = await this.modalCtrl.create({
      component: ShareProfileModalPage,
      componentProps: {
        profile: this.profile,
      },
    });
    modal.present();
  }

  async sendMessage() {
    if (!this.profile) return;

    const modal = await this.modalCtrl.create({
      component: NewMessageModalPage,
      componentProps: {
        initialRecipientId: this.profile.id,
      },
    });
    modal.present();
  }

  isLoggedIn() {
    return this.utilService.isLoggedIn();
  }

  setupMyProfile() {
    this.navCtrl.navigateForward(RouteMap.MyProfilePage.getPath());
  }

  async setupMyProfileAlert() {
    const header = await this.translate
      .get("pages.profile.setup.header")
      .toPromise();
    const message = await this.translate
      .get("pages.profile.setup.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const setup = await this.translate
      .get("pages.profile.setup.confirm")
      .toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
        },
        {
          text: setup,
          handler: () => {
            this.setupMyProfile();
          },
        },
      ],
    });
    await alert.present();
    await alert.onDidDismiss();
  }

  async auth() {
    const authModal = await this.modalCtrl.create({
      component: AuthPage,
      componentProps: {
        register: true,
      },
    });
    await authModal.present();
    await authModal.onDidDismiss();
  }

  async authAndAddFriend() {
    await this.auth();
    await Promise.all([this.meQuery.refresh(), this.load()]);

    if (this.incomingFriendship || this.outgoingFriendship) {
      const message = await this.translate
        .get("pages.profile.alreadyRequested")
        .toPromise();

      const tst = await this.toastCtrl.create({
        message,
        duration: 3000,
      });
      await tst.present();
      return;
    }

    if (!this.me()?.enableProfile) {
      this.setupMyProfileAlert();
      return;
    }

    await this.addFriend();
  }
}
