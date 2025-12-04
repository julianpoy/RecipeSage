import { Component, inject, Input } from "@angular/core";
import { ModalController } from "@ionic/angular";

import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { TRPCService } from "../../../services/trpc.service";

@Component({
  selector: "page-shopping-list-category-order-modal",
  templateUrl: "shopping-list-category-order-modal.page.html",
  styleUrls: ["shopping-list-category-order-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class ShoppingListCategoryOrderModalPage {
  private modalCtrl = inject(ModalController);
  private trpcService = inject(TRPCService);

  @Input({
    required: true,
  })
  shoppingListId!: string;

  @Input({
    required: true,
  })
  categoryOrder: string | undefined;

  async save() {
    await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.updateShoppingList.mutate({
        id: this.shoppingListId,
        categoryOrder: this.categoryOrder,
      }),
    );
    this.close();
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
