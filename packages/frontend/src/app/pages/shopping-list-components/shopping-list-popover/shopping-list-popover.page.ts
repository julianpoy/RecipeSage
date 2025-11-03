import { Component, Input, inject } from "@angular/core";
import {
  ToastController,
  AlertController,
  NavController,
  PopoverController,
  ModalController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { PreferencesService } from "~/services/preferences.service";
import { ShoppingListPreferenceKey } from "@recipesage/util/shared";
import { UpdateShoppingListModalPage } from "../update-shopping-list-modal/update-shopping-list-modal.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  ShoppingListItemSummary,
  ShoppingListSummary,
} from "@recipesage/prisma";
import { TRPCService } from "../../../services/trpc.service";

@Component({
  selector: "page-shopping-list-popover",
  templateUrl: "shopping-list-popover.page.html",
  styleUrls: ["shopping-list-popover.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class ShoppingListPopoverPage {
  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  utilService = inject(UtilService);
  preferencesService = inject(PreferencesService);
  loadingService = inject(LoadingService);
  trpcService = inject(TRPCService);
  toastCtrl = inject(ToastController);
  popoverCtrl = inject(PopoverController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);

  @Input({
    required: true,
  })
  shoppingListId!: string;
  @Input({
    required: true,
  })
  shoppingList!: ShoppingListSummary;
  @Input({
    required: true,
  })
  shoppingListItems!: ShoppingListItemSummary[];

  preferences = this.preferencesService.preferences;
  preferenceKeys = ShoppingListPreferenceKey;

  savePreferences() {
    this.preferencesService.save();

    this.dismiss();
  }

  dismiss() {
    this.popoverCtrl.dismiss();
  }

  print() {
    window.open(
      this.utilService.generatePrintShoppingListURL(this.shoppingListId, {
        groupSimilar: this.preferences[ShoppingListPreferenceKey.GroupSimilar],
        groupCategories:
          this.preferences[ShoppingListPreferenceKey.GroupCategories],
        sortBy: this.preferences[ShoppingListPreferenceKey.SortBy],
      }),
    );
  }

  async removeAllItems() {
    const header = await this.translate
      .get("pages.shoppingListPopover.removeAll.header")
      .toPromise();
    const message = await this.translate
      .get("pages.shoppingListPopover.removeAll.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const del = await this.translate.get("generic.delete").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
          handler: () => {},
        },
        {
          text: del,
          cssClass: "alertDanger",
          handler: () => {
            this._removeAllItems();
          },
        },
      ],
    });
    await alert.present();
    await alert.onDidDismiss();

    this.dismiss();
  }

  async _removeAllItems() {
    if (this.shoppingListItems.length === 0) {
      return;
    }

    const loading = this.loadingService.start();

    const itemIds = this.shoppingListItems.map((el: any) => el.id);

    await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.deleteShoppingListItems.mutate({
        ids: itemIds,
        shoppingListId: this.shoppingListId,
      }),
    );

    loading.dismiss();
  }

  async deleteList() {
    const header = await this.translate
      .get("pages.shoppingListPopover.deleteList.header")
      .toPromise();
    const message = await this.translate
      .get("pages.shoppingListPopover.deleteList.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const del = await this.translate.get("generic.delete").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
          handler: () => {},
        },
        {
          text: del,
          cssClass: "alertDanger",
          handler: () => {
            this._deleteList();
          },
        },
      ],
    });
    alert.present();
  }

  async _deleteList() {
    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.deleteShoppingList.mutate({
        id: this.shoppingListId,
      }),
    );
    loading.dismiss();
    if (!response) return;

    this.popoverCtrl.dismiss();
    this.navCtrl.navigateBack(RouteMap.ShoppingListsPage.getPath());
  }

  async updateList(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: UpdateShoppingListModalPage,
      componentProps: {
        shoppingListId: this.shoppingListId,
      },
    });

    await modal.present();
    await modal.onDidDismiss();

    this.dismiss();
  }
}
