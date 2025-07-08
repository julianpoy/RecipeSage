import { Component, inject } from "@angular/core";
import {
  ModalController,
  ToastController,
  NavController,
} from "@ionic/angular";

import { LoadingService } from "~/services/loading.service";
import { ShoppingListService } from "~/services/shopping-list.service";
import { MessagingService } from "~/services/messaging.service";
import { UserService } from "~/services/user.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectCollaboratorsComponent } from "../../../components/select-collaborators/select-collaborators.component";

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
  shoppingListService = inject(ShoppingListService);
  messagingService = inject(MessagingService);
  userService = inject(UserService);
  toastCtrl = inject(ToastController);

  listTitle = "";

  selectedCollaboratorIds: string[] = [];

  async save() {
    const loading = this.loadingService.start();

    const response = await this.shoppingListService.create({
      title: this.listTitle,
      collaborators: this.selectedCollaboratorIds,
    });

    loading.dismiss();
    if (!response.success) return;

    this.modalCtrl.dismiss({
      success: true,
    });
    this.navCtrl.navigateRoot(
      RouteMap.ShoppingListPage.getPath(response.data.id),
    );
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false,
    });
  }
}
