import { Component, inject, Input } from "@angular/core";
import {
  ModalController,
  ToastController,
  NavController,
} from "@ionic/angular";

import { LoadingService } from "~/services/loading.service";
import { MessagingService } from "~/services/messaging.service";
import { UserService } from "~/services/user.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectCollaboratorsComponent } from "../../../components/select-collaborators/select-collaborators.component";
import { TRPCService } from "../../../services/trpc.service";

@Component({
  selector: "page-new-shopping-list-modal",
  templateUrl: "new-shopping-list-modal.page.html",
  styleUrls: ["new-shopping-list-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectCollaboratorsComponent],
})
export class NewShoppingListModalPage {
  modalCtrl = inject(ModalController);
  navCtrl = inject(NavController);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  trpcService = inject(TRPCService);
  messagingService = inject(MessagingService);
  userService = inject(UserService);
  toastCtrl = inject(ToastController);

  @Input() openAfterCreate = true;

  saving = false;
  listTitle = "";

  selectedCollaboratorIds: string[] = [];

  async save() {
    if (this.saving) return;

    this.saving = true;
    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.createShoppingList.mutate({
        title: this.listTitle,
        collaboratorUserIds: this.selectedCollaboratorIds,
      }),
    );

    this.saving = false;
    loading.dismiss();
    if (!response) return;

    this.modalCtrl.dismiss({
      success: true,
    });
    if (this.openAfterCreate) {
      this.navCtrl.navigateRoot(RouteMap.ShoppingListPage.getPath(response.id));
    }
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false,
    });
  }
}
