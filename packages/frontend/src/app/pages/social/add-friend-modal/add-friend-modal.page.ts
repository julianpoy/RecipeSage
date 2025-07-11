import { Component, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
  AlertController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { UserService } from "~/services/user.service";
import { LoadingService } from "~/services/loading.service";
import { RouteMap } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectUserComponent } from "../../../components/select-user/select-user.component";

@Component({
  selector: "page-add-friend-modal",
  templateUrl: "add-friend-modal.page.html",
  styleUrls: ["add-friend-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectUserComponent],
})
export class AddFriendModalPage {
  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private loadingService = inject(LoadingService);
  private userService = inject(UserService);
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

    const profile = await this.userService.getProfileByUserId(
      this.recipientId,
      {
        403: () => this.profileDisabledError(),
      },
    );

    loading.dismiss();
    if (!profile.success) return;

    const friendRequest = await this.userService.addFriend(this.recipientId);
    if (!friendRequest.success) return;

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

    const profile = await this.userService.getProfileByUserId(
      this.recipientId,
      {
        403: () => this.profileDisabledError(),
      },
    );

    loading.dismiss();
    if (!profile.success) return;

    this.navCtrl.navigateForward(
      RouteMap.ProfilePage.getPath(`@${profile.data.handle}`),
    );
    this.modalCtrl.dismiss();
  }
}
