import { Component, Input } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';
import {TranslateService} from '@ngx-translate/core';

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
  recipientId = '';
  recipientInfo;

  message = '';

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
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

  async setSelectedUser(recipientId: string) {
    this.recipientInfo = await this.userService.getUserById(recipientId);
  }

  onSelectedUserChange(event) {
    this.recipientId = event ? event.id : null;
  }

  async send() {
    const defaultMessage = await this.translate.get('pages.newMessageModal.defaultMessage').toPromise();

    this.message = this.message || defaultMessage;

    const response = await this.messagingService.create({
      to: this.recipientId,
      body: this.message
    });
    if (!response.success) return;

    this.modalCtrl.dismiss();
    this.navCtrl.navigateForward(RouteMap.MessageThreadPage.getPath(this.recipientId));
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
