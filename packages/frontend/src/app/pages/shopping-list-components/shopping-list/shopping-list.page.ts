import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  NavController,
  ToastController,
  ModalController,
  PopoverController,
  AlertController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "~/services/loading.service";
import {
  ShoppingList,
  ShoppingListService,
} from "~/services/shopping-list.service";
import { WebsocketService } from "~/services/websocket.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { PreferencesService } from "~/services/preferences.service";
import { ShoppingListPreferenceKey } from "@recipesage/util";
import { getShoppingListItemGroupings } from "@recipesage/util";

import { NewShoppingListItemModalPage } from "../new-shopping-list-item-modal/new-shopping-list-item-modal.page";
import { ShoppingListPopoverPage } from "../shopping-list-popover/shopping-list-popover.page";

@Component({
  selector: "page-shopping-list",
  templateUrl: "shopping-list.page.html",
  styleUrls: ["shopping-list.page.scss"],
})
export class ShoppingListPage {
  defaultBackHref: string = RouteMap.ShoppingListsPage.getPath();

  shoppingListId: string;
  list?: ShoppingList;

  items: any[] = [];
  completedItems: any[] = [];
  groupTitles: string[] = [];
  categoryTitles: string[] = [];
  categoryTitleCollapsed: Record<string, boolean> = {};
  itemsByGroupTitle: any = {};
  itemsByCategoryTitle: any = {};
  groupsByCategoryTitle: any = {};
  groupTitleExpanded: Record<string, boolean> = {};
  itemsByRecipeId: any = {};
  recipeIds: any = [];

  preferences = this.preferencesService.preferences;
  preferenceKeys = ShoppingListPreferenceKey;

  initialLoadComplete = false;

  reference = "0";

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public loadingService: LoadingService,
    public shoppingListService: ShoppingListService,
    public websocketService: WebsocketService,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public alertCtrl: AlertController,
    public popoverCtrl: PopoverController,
    public route: ActivatedRoute,
  ) {
    const shoppingListId = this.route.snapshot.paramMap.get("shoppingListId");
    if (shoppingListId) {
      this.shoppingListId = shoppingListId;
    } else {
      this.navCtrl.navigateRoot(RouteMap.ShoppingListsPage.getPath());
      throw new Error("Shopping list ID not provided");
    }

    this.websocketService.register(
      "shoppingList:itemsUpdated",
      (payload) => {
        if (
          payload.shoppingListId === this.shoppingListId &&
          payload.reference !== this.reference
        ) {
          this.reference = payload.reference;
          this.loadList();
        }
      },
      this,
    );
  }

  ionViewWillEnter() {
    const loading = this.loadingService.start();

    this.initialLoadComplete = false;
    this.loadList().then(
      () => {
        loading.dismiss();
        this.initialLoadComplete = true;
      },
      () => {
        loading.dismiss();
        this.initialLoadComplete = true;
      },
    );
  }

  refresh(loader: any) {
    this.loadList().then(
      () => {
        loader.target.complete();
      },
      () => {
        loader.target.complete();
      },
    );
  }

  processList(list?: ShoppingList) {
    if (list) this.list = list;
    if (!this.list) return;

    const items = this.list.items.filter((item: any) => !item.completed);
    const completedItems = this.list.items.filter(
      (item: any) => item.completed,
    );

    this.recipeIds = [];
    this.itemsByRecipeId = {};

    for (const item of items) {
      // Recipe grouping
      if (!item.recipe) continue;

      const recipeId = item.recipe.id + item.createdAt;

      if (this.recipeIds.indexOf(recipeId) === -1)
        this.recipeIds.push(recipeId);

      if (!this.itemsByRecipeId[recipeId]) this.itemsByRecipeId[recipeId] = [];
      this.itemsByRecipeId[recipeId].push(item);
    }

    const {
      items: sortedItems,
      groupTitles,
      categoryTitles,
      itemsByGroupTitle,
      itemsByCategoryTitle,
      groupsByCategoryTitle,
    } = getShoppingListItemGroupings(
      items as any,
      this.preferences[ShoppingListPreferenceKey.SortBy],
    );

    this.items = sortedItems;
    this.groupTitles = groupTitles;
    this.categoryTitles = categoryTitles;
    this.itemsByGroupTitle = itemsByGroupTitle;
    this.itemsByCategoryTitle = itemsByCategoryTitle;
    this.groupsByCategoryTitle = groupsByCategoryTitle;

    const { items: sortedCompletedItems } = getShoppingListItemGroupings(
      completedItems as any,
      this.preferences[ShoppingListPreferenceKey.SortBy],
    );

    this.completedItems = sortedCompletedItems;
  }

  async loadList() {
    const response = await this.shoppingListService.fetchById(
      this.shoppingListId,
    );
    if (!response.success) return;

    this.processList(response.data);
  }

  async completeItems(items: any[], completed: boolean) {
    if (!this.list) return;

    if (completed && this.preferences[ShoppingListPreferenceKey.PreferDelete]) {
      return this.removeItems(items);
    }

    const loading = this.loadingService.start();

    const itemIds = items
      .map((el) => {
        return el.id;
      })
      .join(",");

    const response = await this.shoppingListService.updateItems(
      this.list.id,
      {
        itemIds,
      },
      {
        completed,
      },
    );

    if (response.success && this.reference !== response.data.reference) {
      this.reference = response.data.reference;
      await this.loadList();
    }

    loading.dismiss();
  }

  removeRecipe(recipeId: string) {
    this.removeItems(this.itemsByRecipeId[recipeId]);
  }

  async removeItemsConfirm(items: any[]) {
    const header = await this.translate
      .get("pages.shoppingList.removeMultiple.header")
      .toPromise();
    const message = await this.translate
      .get("pages.shoppingList.removeMultiple.message")
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
            this.removeItems(items);
          },
        },
      ],
    });
    alert.present();
  }

  async removeItems(items: any[]) {
    if (!this.list) return;

    const loading = this.loadingService.start();

    const itemIds = items.map((el) => {
      return el.id;
    });

    const response = await this.shoppingListService.deleteItems(this.list.id, {
      itemIds: itemIds.join(","),
    });

    await this.loadList();
    loading.dismiss();

    if (!response.success) return;

    const message = await this.translate
      .get("pages.shoppingList.removed", { itemCount: items.length })
      .toPromise();
    const undo = await this.translate
      .get("pages.shoppingList.removed.undo")
      .toPromise();

    const toast = await this.toastCtrl.create({
      message,
      duration: 5000,
      buttons: [
        {
          text: undo,
          handler: () => {
            this._addItems(
              items.map((el) => ({
                title: el.title,
                completed: el.completed,
                id: el.shoppingListId,
                mealPlanItemId: (el.mealPlanItem || {}).id || null,
                recipeId: (el.recipe || {}).id || null,
              })),
            );
          },
        },
      ],
    });
    toast.present();
  }

  async _addItems(items: any[]) {
    if (!this.list) return;

    const loading = this.loadingService.start();

    await this.shoppingListService.addItems(this.list.id, {
      items,
    });

    await this.loadList();
    loading.dismiss();
  }

  async newShoppingListItem(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NewShoppingListItemModalPage,
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.items) return;
      this._addItems(data.items);
    });
  }

  formatItemCreationDate(plainTextDate: string): string {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }

  async presentPopover(event: Event): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: ShoppingListPopoverPage,
      componentProps: {
        shoppingListId: this.shoppingListId,
        shoppingList: this.list,
      },
      event,
    });

    popover.onDidDismiss().then(() => {
      this.processList();
    });

    popover.present();
  }

  openRecipe(id: string): void {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(id));
  }
}
