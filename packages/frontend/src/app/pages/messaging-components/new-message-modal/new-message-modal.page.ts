import { Component, Input } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { User, UserService } from "~/services/user.service";
import { MessagingService } from "~/services/messaging.service";
import { UtilService, RouteMap } from "~/services/util.service";

@Component({
  selector: "page-new-message-modal",
  templateUrl: "new-message-modal.page.html",
  styleUrls: ["new-message-modal.page.scss"],
})
export class NewMessageModalPage {
  @Input() initialRecipientId?: string;
  recipientId?: string;
  recipientInfo?: User;

  message = "";

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public userService: UserService,
    public utilService: UtilService,
    public messagingService: MessagingService,
  ) {
    setTimeout(() => {
      if (this.initialRecipientId) {
        this.setSelectedUser(this.initialRecipientId);
      }
    });
  }

  async setSelectedUser(recipientId: string) {
    const response = await this.userService.getUserById(recipientId);
    if (!response.success) return;

    this.recipientInfo = response.data;
  }

  onSelectedUserChange(event: any) {
    this.recipientId = event ? event.id : null;
  }

  async send() {
    if (!this.recipientId) return;

    const defaultMessage = await this.translate
      .get("pages.newMessageModal.defaultMessage")
      .toPromise();

    this.message = this.message || defaultMessage;

    const response = await this.messagingService.create({
      to: this.recipientId,
      body: this.message,
    });
    if (!response.success) return;

    this.modalCtrl.dismiss();
    this.navCtrl.navigateForward(
      RouteMap.MessageThreadPage.getPath(this.recipientId),
    );
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
