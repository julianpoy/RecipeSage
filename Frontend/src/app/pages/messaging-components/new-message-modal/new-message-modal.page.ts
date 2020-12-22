import { Component, Input } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';

import { UserService } from '@/services/user.service';
import { MessagingService } from '@/services/messaging.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';

@Component({
  selector: 'page-new-message-modal',
  templateUrl: 'new-message-modal.page.html',
  styleUrls: ['new-message-modal.page.scss']
})
export class NewMessageModalPage {

  @Input() initialRecipientId: string;
  recipientId: string = '';
  recipientInfo;

  message = '';

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public userService: UserService,
    public utilService: UtilService,
    public messagingService: MessagingService) {

    setTimeout(() => {
      if (this.initialRecipientId) {
        this.setSelectedUser(this.initialRecipientId);
      }
    });
  }

  async setSelectedUser(recipientId) {
    this.recipientInfo = await this.userService.getUserById(recipientId);
  }

  onSelectedUserChange(event) {
    this.recipientId = event ? event.id : null;
  }

  send() {
    this.message = this.message || 'Hello! I\'d like to chat on RecipeSage';

    this.messagingService.create({
      to: this.recipientId,
      body: this.message
    }).then(response => {
      this.modalCtrl.dismiss();
      this.navCtrl.navigateForward(RouteMap.MessageThreadPage.getPath(this.recipientId));
    }).catch(async err => {
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
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
