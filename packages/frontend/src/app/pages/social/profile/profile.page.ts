import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  ToastController,
  AlertController,
  NavController,
  ModalController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { IS_SELFHOST } from "../../../../environments/environment";

import { UserProfile, UserService } from "~/services/user.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { RecipeService } from "~/services/recipe.service";
import { ImageViewerComponent } from "~/modals/image-viewer/image-viewer.component";
import { NewMessageModalPage } from "~/pages/messaging-components/new-message-modal/new-message-modal.page";
import { ShareProfileModalPage } from "../share-profile-modal/share-profile-modal.page";
import { AuthPage } from "~/pages/auth/auth.page";

@Component({
  selector: "page-profile",
  templateUrl: "profile.page.html",
  styleUrls: ["profile.page.scss"],
})
export class ProfilePage {
  defaultBackHref: string = RouteMap.SocialPage.getPath();
  isSelfHost = IS_SELFHOST;

  handle: string;
  profile?: UserProfile;

  myProfile?: UserProfile;

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public route: ActivatedRoute,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public recipeService: RecipeService,
    public userService: UserService,
  ) {
    const handle = this.route.snapshot.paramMap.get("handle")?.substring(1);

    if (!handle) {
      this.navCtrl.navigateRoot(RouteMap.SocialPage.getPath());
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
    this.load();
  }

  async load() {
    const loading = this.loadingService.start();
    const profileResponse = await this.userService.getProfileByHandle(
      this.handle,
      {
        403: () => this.profileDisabledError(),
      },
    );

    const myProfileResponse = await this.userService.getMyProfile({
      401: () => {},
    });

    loading.dismiss();

    if (profileResponse.success) this.profile = profileResponse.data;
    if (myProfileResponse.success) this.myProfile = myProfileResponse.data;
  }

  async openImageViewer() {
    if (!this.profile) return;

    const imageViewerModal = await this.modalCtrl.create({
      component: ImageViewerComponent,
      componentProps: {
        imageUrls: this.profile.profileImages.map((image) => image.location),
      },
    });
    imageViewerModal.present();
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

  async addFriend() {
    if (!this.profile) return;

    const loading = this.loadingService.start();

    await this.userService.addFriend(this.profile.id);
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

    await this.userService.deleteFriend(this.profile.id);
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

  async refresh(refresher: any) {
    refresher.target.complete();
    this.load();
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
    await this.load();

    if (this.profile?.incomingFriendship || this.profile?.outgoingFriendship) {
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

    if (!this.myProfile?.enableProfile) {
      this.setupMyProfileAlert();
      return;
    }

    await this.addFriend();
  }
}
