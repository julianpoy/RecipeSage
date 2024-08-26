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
import { WebsocketService } from "~/services/websocket.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { PreferencesService } from "~/services/preferences.service";
import {
  ShoppingListPreferenceKey,
  GroupableItemsByGroupAndCategory,
  type GroupableItem,
  type ItemWithGroupTitle,
} from "@recipesage/util/shared";
import { getShoppingListItemGroupings } from "@recipesage/util/shared";

import { NewShoppingListItemModalPage } from "../new-shopping-list-item-modal/new-shopping-list-item-modal.page";
import { ShoppingListPopoverPage } from "../shopping-list-popover/shopping-list-popover.page";
import { TRPCService } from "../../../services/trpc.service";
import type {
  ShoppingListItemSummary,
  ShoppingListSummary,
} from "@recipesage/prisma";

@Component({
  selector: "page-shopping-list",
  templateUrl: "shopping-list.page.html",
  styleUrls: ["shopping-list.page.scss"],
})
export class ShoppingListPage {
  defaultBackHref: string = RouteMap.ShoppingListsPage.getPath();

  shoppingListId: string;
  list?: ShoppingListSummary;

  items: ItemWithGroupTitle<ShoppingListItemSummary>[] = [];
  completedItems: ItemWithGroupTitle<ShoppingListItemSummary>[] = [];
  groupTitles: string[] = [];
  categoryTitles: string[] = [];
  categoryTitleCollapsed: Record<string, boolean> = {};
  itemsByGroupTitle: {
    [key: string]: ItemWithGroupTitle<ShoppingListItemSummary>[];
  } = {};
  itemsByCategoryTitle: {
    [key: string]: ItemWithGroupTitle<ShoppingListItemSummary>[];
  } = {};
  groupsByCategoryTitle: GroupableItemsByGroupAndCategory<
    ItemWithGroupTitle<ShoppingListItemSummary>
  > = {};
  groupTitleExpanded: Record<string, boolean> = {};
  itemsByRecipeId: {
    [key: string]: ShoppingListItemSummary[];
  } = {};
  recipeIds: string[] = [];

  preferences = this.preferencesService.preferences;
  preferenceKeys = ShoppingListPreferenceKey;

  initialLoadComplete = false;

  reference = "0";

  constructor(
    private navCtrl: NavController,
    private translate: TranslateService,
    private loadingService: LoadingService,
    private trpcService: TRPCService,
    private websocketService: WebsocketService,
    private utilService: UtilService,
    private preferencesService: PreferencesService,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private popoverCtrl: PopoverController,
    private route: ActivatedRoute,
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
    this.loadList().finally(() => {
      loading.dismiss();
      this.initialLoadComplete = true;
    });
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

  processList(listItemSummaries: ShoppingListItemSummary[]) {
    const items = listItemSummaries.filter((item) => !item.completed);
    const completedItems = listItemSummaries.filter((item) => item.completed);

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
      items,
      this.preferences[ShoppingListPreferenceKey.SortBy],
    );

    this.items = sortedItems;
    this.groupTitles = groupTitles;
    this.categoryTitles = categoryTitles;
    this.itemsByGroupTitle = itemsByGroupTitle;
    this.itemsByCategoryTitle = itemsByCategoryTitle;
    this.groupsByCategoryTitle = groupsByCategoryTitle;

    const { items: sortedCompletedItems } = getShoppingListItemGroupings(
      completedItems,
      this.preferences[ShoppingListPreferenceKey.SortBy],
    );

    this.completedItems = sortedCompletedItems;
  }

  async loadList() {
    const shoppingList = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.getShoppingList.query({
        id: this.shoppingListId,
      }),
    );

    if (!shoppingList) return;
    this.list = shoppingList;

    const shoppingListItems = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.getShoppingListItems.query({
        shoppingListId: this.shoppingListId,
      }),
    );

    if (!shoppingListItems) return;

    this.processList(shoppingListItems);
  }

  async completeItems(items: ShoppingListItemSummary[], completed: boolean) {
    if (!this.list) return;

    if (completed && this.preferences[ShoppingListPreferenceKey.PreferDelete]) {
      return this.removeItems(items);
    }

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.updateShoppingListItems.mutate({
        shoppingListId: this.shoppingListId,
        items: items.map((item) => ({
          ...item,
          completed,
        })),
      }),
    );
    loading.dismiss();

    if (!response) return;
    if (this.reference === response.reference) return;
    this.reference = response.reference;

    await this.loadList();
  }

  removeRecipe(recipeId: string) {
    this.removeItems(this.itemsByRecipeId[recipeId]);
  }

  async removeItemsConfirm(items: ShoppingListItemSummary[]) {
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

  async removeItems(items: ShoppingListItemSummary[]) {
    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.deleteShoppingListItems.mutate({
        shoppingListId: this.shoppingListId,
        ids: items.map((item) => item.id),
      }),
    );
    loading.dismiss();

    if (!response) return;
    await this.loadList();

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
                mealPlanItemId: el.mealPlanItemId,
                recipeId: el.recipeId,
              })),
            );
          },
        },
      ],
    });
    toast.present();
  }

  async _addItems(
    items: {
      title: string;
      completed: boolean;
      mealPlanItemId: string | null;
      recipeId: string | null;
    }[],
  ) {
    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.createShoppingListItems.mutate({
        shoppingListId: this.shoppingListId,
        items,
      }),
    );
    loading.dismiss();

    if (!response) return;
    if (this.reference === response.reference) return;
    this.reference = response.reference;

    await this.loadList();
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
        shoppingList: this.list,
        shoppingListItems: this.items,
      },
      event,
    });

    await popover.present();
    await popover.onDidDismiss();

    const loading = this.loadingService.start();

    this.loadList().finally(() => {
      loading.dismiss();
    });
  }

  openRecipe(id: string): void {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(id));
  }
}
