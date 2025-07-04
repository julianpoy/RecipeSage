import { Component, Input, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { MessagingService } from "~/services/messaging.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { TRPCService } from "../../../services/trpc.service";
import { UserPublic } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectUserComponent } from "../../../components/select-user/select-user.component";

@Component({
  selector: "page-new-message-modal",
  templateUrl: "new-message-modal.page.html",
  styleUrls: ["new-message-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectUserComponent],
})
export class NewMessageModalPage {
  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  modalCtrl = inject(ModalController);
  toastCtrl = inject(ToastController);
  trpcService = inject(TRPCService);
  utilService = inject(UtilService);
  messagingService = inject(MessagingService);

  @Input() initialRecipientId?: string;
  recipientId?: string;
  recipientInfo?: UserPublic;

  message = "";

  constructor() {
    setTimeout(() => {
      if (this.initialRecipientId) {
        this.setSelectedUser(this.initialRecipientId);
      }
    });
  }

  async setSelectedUser(recipientId: string) {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.users.getUserProfilesById.query({
        ids: [recipientId],
      }),
    );
    const profile = response?.at(0);
    if (!profile) return;

    this.recipientInfo = profile;
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
