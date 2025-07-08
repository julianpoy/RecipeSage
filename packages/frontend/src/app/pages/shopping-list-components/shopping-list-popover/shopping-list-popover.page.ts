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
import { ShoppingListService } from "~/services/shopping-list.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { PreferencesService } from "~/services/preferences.service";
import { ShoppingListPreferenceKey } from "@recipesage/util/shared";
import { UpdateShoppingListModalPage } from "../update-shopping-list-modal/update-shopping-list-modal.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

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
  shoppingListService = inject(ShoppingListService);
  toastCtrl = inject(ToastController);
  popoverCtrl = inject(PopoverController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);

  @Input() shoppingListId: any;
  @Input() shoppingList: any;
  @Input() editMode: boolean = false;

  preferences = this.preferencesService.preferences;
  preferenceKeys = ShoppingListPreferenceKey;

  savePreferences() {
    this.preferencesService.save();

    this.dismiss();
  }

  dismiss() {
    this.popoverCtrl.dismiss({ editMode: this.editMode });
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
    alert.present();
  }

  async _removeAllItems() {
    if (this.shoppingList.items.length === 0) return;

    const loading = this.loadingService.start();

    const itemIds = this.shoppingList.items.map((el: any) => el.id);

    const response = await this.shoppingListService.deleteItems(
      this.shoppingListId,
      {
        itemIds,
      },
    );

    loading.dismiss();
    if (!response.success) return;

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

    const response = await this.shoppingListService.delete(this.shoppingListId);
    loading.dismiss();

    if (!response.success) return;

    this.popoverCtrl.dismiss();
    this.navCtrl.navigateBack(RouteMap.ShoppingListsPage.getPath());
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    this.dismiss();
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
