import { Component, inject } from "@angular/core";
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
import { AddFriendModalPage } from "../add-friend-modal/add-friend-modal.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import { SelfhostWarningItemComponent } from "../../../components/selfhost-warning-item/selfhost-warning-item.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonLabel,
  IonButton,
  IonItem,
  IonAvatar,
  IonList,
  IonItemDivider,
  IonFab,
  IonFabButton,
  IonSpinner,
  IonBadge,
} from "@ionic/angular/standalone";
import {
  add,
  chatbubbles,
  mail,
  people,
  personCircle,
  search,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-people",
  templateUrl: "people.page.html",
  styleUrls: ["people.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    NullStateComponent,
    SelfhostWarningItemComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonIcon,
    IonLabel,
    IonButton,
    IonItem,
    IonAvatar,
    IonList,
    IonItemDivider,
    IonFab,
    IonFabButton,
    IonSpinner,
    IonBadge,
  ],
})
export class PeoplePage {
  constructor() {
    addIcons({ add, chatbubbles, mail, people, personCircle, search });
  }

  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  toastCtrl = inject(ToastController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  serverActionsService = inject(ServerActionsService);

  defaultBackHref: string = RouteMap.SettingsPage.getPath();
  isSelfHost = IS_SELFHOST;

  private meQuery = this.serverActionsService.users.getMe();
  me = this.meQuery.value;

  friendships?: RouterOutputs["users"]["getMyFriends"];
  inboxCount?: number;

  ionViewWillEnter() {
    this.load();
  }

  load() {
    const loading = this.loadingService.start();

    this.meQuery.refresh();

    this.serverActionsService.users.getMyFriends().then((friendships) => {
      loading.dismiss();
      this.friendships = friendships;
    });

    this.loadInboxCount();
  }

  async loadInboxCount() {
    const response = await this.serverActionsService.recipes.getRecipeCount({
      folder: "inbox",
    });
    if (!response) return;
    this.inboxCount = response.count;
  }

  goToMessages() {
    this.navCtrl.navigateForward(RouteMap.MessagesPage.getPath());
  }

  goToInbox() {
    this.navCtrl.navigateForward(RouteMap.HomePage.getPath("inbox"));
  }

  async findProfile() {
    if (!this.me()?.enableProfile) {
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
    await this.serverActionsService.users.createFriendship({ friendId });
    this.load();
  }

  async deleteFriend(friendId: string) {
    await this.serverActionsService.users.deleteFriendship({ friendId });
    this.load();
  }

  async openProfile(handle: string | null) {
    if (!handle) return;
    this.navCtrl.navigateForward(RouteMap.ProfilePage.getPath(`@${handle}`));
  }

  async editProfile() {
    this.navCtrl.navigateForward(RouteMap.MyProfilePage.getPath());
  }
}
