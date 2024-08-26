import { Component, Input } from "@angular/core";
import {
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
import type {
  ShoppingListItemSummary,
  ShoppingListSummary,
} from "@recipesage/prisma";
import { TRPCService } from "../../../services/trpc.service";

@Component({
  selector: "page-shopping-list-popover",
  templateUrl: "shopping-list-popover.page.html",
  styleUrls: ["shopping-list-popover.page.scss"],
})
export class ShoppingListPopoverPage {
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

  constructor(
    private navCtrl: NavController,
    private translate: TranslateService,
    private utilService: UtilService,
    private preferencesService: PreferencesService,
    private loadingService: LoadingService,
    private trpcService: TRPCService,
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
  ) {}

  savePreferences() {
    this.preferencesService.save();

    this.dismiss();
  }

  dismiss() {
    this.popoverCtrl.dismiss();
  }

  print() {
    window.open(
      this.utilService.generatePrintShoppingListURL(this.shoppingList.id, {
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
    alert.present();
  }

  async _removeAllItems() {
    if (!this.shoppingListItems.length) return;

    const loading = this.loadingService.start();

    const itemIds = this.shoppingListItems.map((el) => el.id);

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.deleteShoppingListItems.mutate({
        shoppingListId: this.shoppingList.id,
        ids: itemIds,
      }),
    );

    loading.dismiss();

    if (!response) return;

    this.popoverCtrl.dismiss();
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
        id: this.shoppingList.id,
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
        shoppingListId: this.shoppingList.id,
      },
    });

    await modal.present();
    await modal.onDidDismiss();

    this.dismiss();
  }
}
