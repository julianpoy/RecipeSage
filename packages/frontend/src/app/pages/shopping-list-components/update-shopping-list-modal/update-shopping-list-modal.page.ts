import { Component, Input, inject } from "@angular/core";
import {
  ModalController,
  ToastController,
  NavController,
} from "@ionic/angular";

import { LoadingService } from "~/services/loading.service";
import { MessagingService } from "~/services/messaging.service";
import { UserService } from "~/services/user.service";
import { UtilService } from "~/services/util.service";
import { TRPCService } from "../../../services/trpc.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectCollaboratorsComponent } from "../../../components/select-collaborators/select-collaborators.component";

@Component({
  standalone: true,
  selector: "page-update-shopping-list-modal",
  templateUrl: "update-shopping-list-modal.page.html",
  styleUrls: ["update-shopping-list-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectCollaboratorsComponent],
})
export class UpdateShoppingListModalPage {
  modalCtrl = inject(ModalController);
  navCtrl = inject(NavController);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  trpcService = inject(TRPCService);
  messagingService = inject(MessagingService);
  userService = inject(UserService);
  toastCtrl = inject(ToastController);

  @Input({
    required: true,
  })
  shoppingListId: string = "";

  loaded = false;
  listTitle = "";
  selectedCollaboratorIds: string[] = [];

  async load() {
    this.loaded = false;
    if (!this.shoppingListId) throw new Error("Shopping list ID not present");

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.getShoppingList.query({
        id: this.shoppingListId,
      }),
    );

    loading.dismiss();
    if (!response) return;

    this.listTitle = response.title;
    this.selectedCollaboratorIds = response.collaboratorUsers.map(
      (collaboratorUser) => collaboratorUser.user.id,
    );
    this.loaded = true;
  }

  ionViewWillEnter() {
    this.load();
  }

  async save() {
    if (!this.shoppingListId) throw new Error("Shopping list ID not present");

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.updateShoppingList.mutate({
        id: this.shoppingListId,
        title: this.listTitle,
        collaboratorUserIds: this.selectedCollaboratorIds,
      }),
    );

    loading.dismiss();
    if (!response) return;

    this.modalCtrl.dismiss({
      success: true,
    });
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false,
    });
  }
}
