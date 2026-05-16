import { Component, Input, inject } from "@angular/core";
import {
  AlertController,
  NavController,
  PopoverController,
  ModalController,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { PreferencesService } from "~/services/preferences.service";
import {
  GlobalPreferenceKey,
  ShoppingListPreferenceKey,
} from "@recipesage/util/shared";
import { UpdateShoppingListModalPage } from "../update-shopping-list-modal/update-shopping-list-modal.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import type {
  ShoppingListItemSummary,
  ShoppingListSummary,
} from "@recipesage/prisma";
import { ServerActionsService } from "../../../services/server-actions.service";
import { ShoppingListCategoryOrderModalPage } from "../shopping-list-category-order-modal/shopping-list-category-order-modal.page";
import {
  IonList,
  IonListHeader,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonButton,
  IonIcon,
} from "@ionic/angular/standalone";
import {
  pencil,
  print,
  removeCircle,
  reorderThree,
  trash,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-shopping-list-popover",
  templateUrl: "shopping-list-popover.page.html",
  styleUrls: ["shopping-list-popover.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonList,
    IonListHeader,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonButton,
    IonIcon,
  ],
})
export class ShoppingListPopoverPage {
  constructor() {
    addIcons({ pencil, print, removeCircle, reorderThree, trash });
  }

  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private utilService = inject(UtilService);
  private preferencesService = inject(PreferencesService);
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);
  private popoverCtrl = inject(PopoverController);
  private alertCtrl = inject(AlertController);
  private modalCtrl = inject(ModalController);

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
  @Input({
    required: true,
  })
  isOwner!: boolean;

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
        preferredLanguage:
          this.preferences[GlobalPreferenceKey.Language] || undefined,
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

    await this.serverActionsService.shoppingLists.deleteShoppingListItems({
      ids: itemIds,
      shoppingListId: this.shoppingListId,
    });

    loading.dismiss();
  }

  async deleteList() {
    const headerOwner = await this.translate
      .get("pages.shoppingListPopover.deleteList.header")
      .toPromise();
    const messageOwner = await this.translate
      .get("pages.shoppingListPopover.deleteList.message")
      .toPromise();
    const headerCollaborator = await this.translate
      .get("pages.shoppingListPopover.removeSelfFromList.header")
      .toPromise();
    const messageCollaborator = await this.translate
      .get("pages.shoppingListPopover.removeSelfFromList.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const delOwner = await this.translate.get("generic.delete").toPromise();
    const delCollaborator = await this.translate
      .get("generic.confirm")
      .toPromise();

    const alert = await this.alertCtrl.create({
      header: this.isOwner ? headerOwner : headerCollaborator,
      message: this.isOwner ? messageOwner : messageCollaborator,
      buttons: [
        {
          text: cancel,
          role: "cancel",
          handler: () => {},
        },
        {
          text: this.isOwner ? delOwner : delCollaborator,
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

    const response =
      await this.serverActionsService.shoppingLists.deleteShoppingList({
        id: this.shoppingListId,
      });
    loading.dismiss();
    if (!response) return;

    this.popoverCtrl.dismiss({
      reference: response.reference,
      doNotLoad: true,
    });
    this.navCtrl.navigateBack(RouteMap.ShoppingListsPage.getPath());
  }

  async updateList(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: UpdateShoppingListModalPage,
      componentProps: {
        shoppingList: this.shoppingList,
      },
    });

    await modal.present();
    await modal.onDidDismiss();

    this.dismiss();
  }

  async showCategoryOrderModal() {
    const modal = await this.modalCtrl.create({
      component: ShoppingListCategoryOrderModalPage,
      componentProps: {
        shoppingListId: this.shoppingListId,
        categoryOrder: this.shoppingList.categoryOrder || undefined,
      },
    });
    await modal.present();
    await modal.onDidDismiss();

    this.dismiss();
  }
}
