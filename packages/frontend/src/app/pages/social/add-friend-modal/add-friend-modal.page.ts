import { Component, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
  AlertController,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { ServerActionsService } from "../../../services/server-actions.service";
import { LoadingService } from "../../../services/loading.service";
import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectUserComponent } from "../../../components/select-user/select-user.component";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonLabel,
  IonFooter,
} from "@ionic/angular/standalone";
import { close, open, send } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-add-friend-modal",
  templateUrl: "add-friend-modal.page.html",
  styleUrls: ["add-friend-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectUserComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonLabel,
    IonFooter,
  ],
})
export class AddFriendModalPage {
  constructor() {
    addIcons({ close, open, send });
  }

  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);
  private modalCtrl = inject(ModalController);

  recipientId?: string;

  cancel() {
    this.modalCtrl.dismiss();
  }

  onSelectedUserChange(event: any) {
    this.recipientId = event ? event.id : null;
  }

  async profileDisabledError() {
    const header = await this.translate
      .get("pages.addFriendModal.profileDisabled.header")
      .toPromise();
    const message = await this.translate
      .get("pages.addFriendModal.profileDisabled.message")
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

  async send() {
    if (!this.recipientId) return;

    const loading = this.loadingService.start();

    const profiles = await this.serverActionsService.users.getUserProfilesById({
      ids: [this.recipientId],
    });

    loading.dismiss();

    const profile = profiles?.[0];
    if (!profile) return;
    if (!profile.enableProfile) {
      this.profileDisabledError();
      return;
    }

    const friendRequest =
      await this.serverActionsService.users.createFriendship({
        friendId: this.recipientId,
      });
    if (!friendRequest) return;

    const message = await this.translate
      .get("pages.addFriendModal.success")
      .toPromise();

    this.modalCtrl.dismiss();
    const tst = await this.toastCtrl.create({
      message,
      duration: 5000,
    });
    tst.present();
  }

  async open() {
    if (!this.recipientId) return;

    const loading = this.loadingService.start();

    const profiles = await this.serverActionsService.users.getUserProfilesById({
      ids: [this.recipientId],
    });

    loading.dismiss();

    const profile = profiles?.[0];
    if (!profile) return;
    if (!profile.enableProfile) {
      this.profileDisabledError();
      return;
    }

    this.navCtrl.navigateForward(
      RouteMap.ProfilePage.getPath(`@${profile.handle}`),
    );
    this.modalCtrl.dismiss();
  }
}
