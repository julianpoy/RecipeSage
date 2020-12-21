import { Component, Input } from '@angular/core';
import { NavController, ModalController, ToastController, AlertController } from '@ionic/angular';

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
    private alertCtrl: AlertController,
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

  async profileDisabledError() {
    const alert = await this.alertCtrl.create({
      header: 'Profile is not enabled',
      message: 'This user has disabled their profile and is therefore private/inaccessible.',
      buttons: [
        {
          text: 'Okay',
          handler: () => {
            this.navCtrl.navigateRoot(RouteMap.PeoplePage.getPath());
          }
        }
      ]
    });
    alert.present();
  }

  async send() {
    const loading = this.loadingService.start();

    const profile = await this.userService.getProfileByUserId(this.recipientId, {
      403: () => this.profileDisabledError()
    });

    loading.dismiss();

    if (profile) {
      await this.userService.addFriend(this.recipientId);
      this.modalCtrl.dismiss();
      const tst = await this.toastCtrl.create({
        message: 'Friend invite sent!',
        duration: 5000
      });
      tst.present();
    }
  }

  async open() {
    const loading = this.loadingService.start();

    const profile = await this.userService.getProfileByUserId(this.recipientId, {
      403: () => this.profileDisabledError()
    });

    loading.dismiss();

    if (profile) {
      this.navCtrl.navigateForward(RouteMap.ProfilePage.getPath(`@${profile.handle}`));
      this.modalCtrl.dismiss();
    }
  }
}
