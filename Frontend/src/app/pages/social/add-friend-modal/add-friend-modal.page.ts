import { Component, Input } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';

import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';

@Component({
  selector: 'page-add-friend-modal',
  templateUrl: 'add-friend-modal.page.html',
  styleUrls: ['add-friend-modal.page.scss']
})
export class AddFriendModalPage {

  recipientId;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private utilService: UtilService,
    private loadingService: LoadingService,
    private userService: UserService,
    private modalCtrl: ModalController
  ) {}

  cancel() {
    this.modalCtrl.dismiss();
  }

  onSelectedUserChange(event) {
    this.recipientId = event ? event.id : null;
  }

  async send() {
    const loading = this.loadingService.start();

    try {
      await this.userService.addFriend(this.recipientId);
      this.modalCtrl.dismiss();
    } catch(err) {
      switch (err.response.status) {
        case 0:
          const offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.modalCtrl.dismiss();
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
    }

    loading.dismiss();
  }
}
