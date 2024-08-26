import { Component } from "@angular/core";
import { ModalController, NavController } from "@ionic/angular";

import { LoadingService } from "~/services/loading.service";
import { RouteMap } from "~/services/util.service";
import { TRPCService } from "../../../services/trpc.service";

@Component({
  selector: "page-new-shopping-list-modal",
  templateUrl: "new-shopping-list-modal.page.html",
  styleUrls: ["new-shopping-list-modal.page.scss"],
})
export class NewShoppingListModalPage {
  listTitle = "";

  selectedCollaboratorIds: string[] = [];

  constructor(
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    private loadingService: LoadingService,
    private trpcService: TRPCService,
  ) {}

  async save() {
    if (!this.listTitle.length) return;

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.createShoppingList.mutate({
        title: this.listTitle,
        collaboratorUserIds: this.selectedCollaboratorIds,
      }),
    );

    loading.dismiss();
    if (!response) return;

    this.modalCtrl.dismiss({
      success: true,
    });
    this.navCtrl.navigateRoot(RouteMap.ShoppingListPage.getPath(response.id));
  }

  cancel() {
    this.modalCtrl.dismiss({
      success: false,
    });
  }
}
