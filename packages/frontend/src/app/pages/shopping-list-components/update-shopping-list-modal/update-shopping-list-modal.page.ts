import { Component, Input } from "@angular/core";
import { ModalController } from "@ionic/angular";

import { LoadingService } from "~/services/loading.service";
import { TRPCService } from "../../../services/trpc.service";

@Component({
  selector: "page-update-shopping-list-modal",
  templateUrl: "update-shopping-list-modal.page.html",
  styleUrls: ["update-shopping-list-modal.page.scss"],
})
export class UpdateShoppingListModalPage {
  @Input({
    required: true,
  })
  shoppingListId: string = "";

  loaded = false;
  listTitle = "";
  selectedCollaboratorIds: string[] = [];

  constructor(
    private modalCtrl: ModalController,
    private loadingService: LoadingService,
    private trpcService: TRPCService,
  ) {}

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
