import { Component, inject } from "@angular/core";
import {
  ToastController,
  AlertController,
  NavController,
  ModalController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { IS_SELFHOST } from "../../../../environments/environment";

import { User, UserProfile, UserService } from "~/services/user.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";
import { RecipeService } from "~/services/recipe.service";
import { AddFriendModalPage } from "../add-friend-modal/add-friend-modal.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import { SelfhostWarningItemComponent } from "../../../components/selfhost-warning-item/selfhost-warning-item.component";

@Component({
  standalone: true,
  selector: "page-people",
  templateUrl: "people.page.html",
  styleUrls: ["people.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    NullStateComponent,
    SelfhostWarningItemComponent,
  ],
})
export class PeoplePage {
  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  toastCtrl = inject(ToastController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  recipeService = inject(RecipeService);
  userService = inject(UserService);

  defaultBackHref: string = RouteMap.SettingsPage.getPath();
  isSelfHost = IS_SELFHOST;

  friendships?: any;
  accountInfo?: User;
  myProfile?: UserProfile;

  ionViewWillEnter() {
    this.load();
  }

  load() {
    const loading = this.loadingService.start();

    Promise.all([
      this.userService.getMyFriends(),
      this.userService.me(),
      this.userService.getMyProfile(),
    ]).then(([friendships, accountInfo, myProfile]) => {
      loading.dismiss();
      if (!friendships.success || !accountInfo.success || !myProfile.success)
        return;

      this.friendships = friendships.data;
      this.accountInfo = accountInfo.data;
      this.myProfile = myProfile.data;
    });
  }

  async findProfile() {
    if (!this.accountInfo?.enableProfile) {
      const header = await this.translate
        .get("pages.people.setup.header")
        .toPromise();
      const message = await this.translate
        .get("pages.people.setup.message")
        .toPromise();
      const cancel = await this.translate.get("generic.cancel").toPromise();
      const setup = await this.translate
        .get("pages.people.setup.confirm")
        .toPromise();

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
            text: setup,
            handler: () => {
              this.editProfile();
            },
          },
        ],
      });
      alert.present();
      return;
    }

    const modal = await this.modalCtrl.create({
      component: AddFriendModalPage,
    });
    modal.present();
    modal.onDidDismiss().then(() => {
      this.load();
    });
  }

  async addFriend(friendId: string) {
    await this.userService.addFriend(friendId);
    this.load();
  }

  async deleteFriend(friendId: string) {
    await this.userService.deleteFriend(friendId);
    this.load();
  }

  async openProfile(handle: string) {
    this.navCtrl.navigateForward(RouteMap.ProfilePage.getPath(`@${handle}`));
  }

  async editProfile() {
    this.navCtrl.navigateForward(RouteMap.MyProfilePage.getPath());
  }

  async refresh(refresher: any) {
    refresher.target.complete();
    this.load();
  }
}
