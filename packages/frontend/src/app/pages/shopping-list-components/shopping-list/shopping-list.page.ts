import { Component, inject } from "@angular/core";
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
  ShoppingListItemSummariesByGroupAndCategory,
  ShoppingListPreferenceKey,
} from "@recipesage/util/shared";
import { getShoppingListItemGroupings } from "@recipesage/util/shared";

import { NewShoppingListItemModalPage } from "../new-shopping-list-item-modal/new-shopping-list-item-modal.page";
import { ShoppingListPopoverPage } from "../shopping-list-popover/shopping-list-popover.page";
import { Title } from "@angular/platform-browser";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { ShoppingListItemComponent } from "../../../components/shopping-list-item/shopping-list-item.component";
import { ShoppingListGroupComponent } from "../../../components/shopping-list-group/shopping-list-group.component";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import { TRPCService } from "../../../services/trpc.service";
import type {
  ShoppingListItemSummary,
  ShoppingListSummary,
  UserPublic,
} from "@recipesage/prisma";

const categoryTitlesToi18n: Record<string, string> = {
  uncategorized: "pages.shoppingList.category.uncategorized",
  produce: "pages.shoppingList.category.produce",
  dairy: "pages.shoppingList.category.dairy",
  meat: "pages.shoppingList.category.meat",
  bakery: "pages.shoppingList.category.bakery",
  grocery: "pages.shoppingList.category.grocery",
  liquor: "pages.shoppingList.category.liquor",
  seafood: "pages.shoppingList.category.seafood",
  nonfood: "pages.shoppingList.category.nonfood",
  frozen: "pages.shoppingList.category.frozen",
  canned: "pages.shoppingList.category.canned",
  beverages: "pages.shoppingList.category.beverages",
};

@Component({
  selector: "page-shopping-list",
  templateUrl: "shopping-list.page.html",
  styleUrls: ["shopping-list.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    ShoppingListItemComponent,
    ShoppingListGroupComponent,
    NullStateComponent,
  ],
})
export class ShoppingListPage {
  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  loadingService = inject(LoadingService);
  trpcService = inject(TRPCService);
  websocketService = inject(WebsocketService);
  utilService = inject(UtilService);
  preferencesService = inject(PreferencesService);
  toastCtrl = inject(ToastController);
  modalCtrl = inject(ModalController);
  alertCtrl = inject(AlertController);
  popoverCtrl = inject(PopoverController);
  route = inject(ActivatedRoute);
  private titleService = inject(Title);

  defaultBackHref: string = RouteMap.ShoppingListsPage.getPath();

  me?: UserPublic;
  shoppingListId: string;
  shoppingList?: ShoppingListSummary;
  shoppingListItems?: ShoppingListItemSummary[];

  items: ShoppingListItemSummary[] = [];
  completedItems: ShoppingListItemSummary[] = [];
  groupTitles: string[] = [];
  categoryTitles: string[] = [];
  categoryTitleCollapsed: Record<string, boolean> = {};
  itemsByGroupTitle: Record<string, ShoppingListItemSummary[]> = {};
  itemsByCategoryTitle: Record<string, ShoppingListItemSummary[]> = {};
  groupsByCategoryTitle: ShoppingListItemSummariesByGroupAndCategory = {};
  groupTitleExpanded: Record<string, boolean> = {};
  itemsByRecipeId: Record<string, ShoppingListItemSummary[]> = {};
  recipeIds: string[] = [];

  preferences = this.preferencesService.preferences;
  preferenceKeys = ShoppingListPreferenceKey;

  reference = "0";

  constructor() {
    const shoppingListId = this.route.snapshot.paramMap.get("shoppingListId");
    if (shoppingListId) {
      this.shoppingListId = shoppingListId;
    } else {
      this.navCtrl.navigateRoot(RouteMap.ShoppingListsPage.getPath());
      throw new Error("Shopping list ID not provided");
    }
  }

  ionViewWillEnter() {
    const loading = this.loadingService.start();

    Promise.all([this.loadList(), this.loadMe()]).finally(() => {
      loading.dismiss();
    });

    this.websocketService.on("shoppingList:itemsUpdated", this.onWSEvent);
  }

  ionViewWillLeave() {
    this.websocketService.off("shoppingList:itemsUpdated", this.onWSEvent);
  }

  onWSEvent = (data: Record<string, string>) => {
    if (
      data.shoppingListId === this.shoppingListId &&
      data.reference !== this.reference
    ) {
      this.reference = data.reference;
      this.loadList();
    }
  };

  refresh(loader: any) {
    this.loadList().finally(() => {
      loader.target.complete();
    });
  }

  async loadMe() {
    const me = await this.trpcService.handle(
      this.trpcService.trpc.users.getMe.query(),
    );
    if (!me) return;

    this.me = me;
  }

  async processList(
    _items: ShoppingListItemSummary[],
    categoryOrder: string | null,
  ) {
    const items = _items
      .filter((item) => !item.completed)
      .map((el) => {
        el.categoryTitle = this.parseCategoryTitle(
          el.categoryTitle || "::uncategorized",
        );
        return el;
      });
    const completedItems = _items
      .filter((item) => item.completed)
      .map((el) => {
        el.categoryTitle = this.parseCategoryTitle(
          el.categoryTitle || "::uncategorized",
        );
        return el;
      });

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
      this.parseCategoryTitle("::uncategorized"),
      categoryOrder,
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
      this.parseCategoryTitle("::uncategorized"),
      categoryOrder,
    );

    this.completedItems = sortedCompletedItems;
  }

  async loadList() {
    const [shoppingList, shoppingListItems] = await Promise.all([
      this.trpcService.handle(
        this.trpcService.trpc.shoppingLists.getShoppingList.query({
          id: this.shoppingListId,
        }),
      ),
      this.trpcService.handle(
        this.trpcService.trpc.shoppingLists.getShoppingListItems.query({
          shoppingListId: this.shoppingListId,
        }),
      ),
    ]);
    if (!shoppingList || !shoppingListItems) return;
    this.shoppingList = shoppingList;
    this.shoppingListItems = shoppingListItems;

    const title = await this.translate
      .get("generic.labeledPageTitle", {
        title: this.shoppingList.title,
      })
      .toPromise();
    this.titleService.setTitle(title);

    this.processList(shoppingListItems, shoppingList.categoryOrder);
  }

  async completeItems(items: ShoppingListItemSummary[], completed: boolean) {
    if (!this.shoppingList) return;

    if (completed && this.preferences[ShoppingListPreferenceKey.PreferDelete]) {
      return this.removeItems(items);
    }

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.updateShoppingListItems.mutate({
        shoppingListId: this.shoppingListId,
        items: items.map((item) => ({
          id: item.id,
          completed,
        })),
      }),
    );
    if (!response) return;

    if (this.reference !== response.reference) {
      this.reference = response.reference;
      await this.loadList();
    }

    loading.dismiss();
  }

  async recategorizeItems(
    items: ShoppingListItemSummary[],
    categoryTitle: string,
  ) {
    if (!this.shoppingList) return;

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.updateShoppingListItems.mutate({
        shoppingListId: this.shoppingListId,
        items: items.map((item) => ({
          id: item.id,
          categoryTitle,
        })),
      }),
    );
    if (!response) return;

    if (this.reference !== response.reference) {
      this.reference = response.reference;
      await this.loadList();
    }

    loading.dismiss();
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
    if (!this.shoppingList) return;
    if (!items.length) return;

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.deleteShoppingListItems.mutate({
        shoppingListId: this.shoppingListId,
        ids: items.map((el) => el.id),
      }),
    );
    if (!response) return;

    if (this.reference !== response.reference) {
      this.reference = response.reference;
      await this.loadList();
    }
    loading.dismiss();

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
                ...el,
                completed: false,
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
      recipeId: string | null;
    }[],
  ) {
    if (!this.shoppingList) return;

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.createShoppingListItems.mutate({
        shoppingListId: this.shoppingListId,
        items: items.map((el) => ({
          title: el.title,
          completed: el.completed,
          recipeId: el.recipeId,
        })),
      }),
    );
    if (!response) return;

    if (this.reference !== response.reference) {
      this.reference = response.reference;
      await this.loadList();
    }
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
        shoppingList: this.shoppingList,
        shoppingListItems: this.shoppingListItems,
      },
      event,
    });

    await popover.present();
    const { data } = await popover.onDidDismiss();
    if (data.reference) this.reference = data.reference;
    if (data.doNotLoad) return;

    const loading = this.loadingService.start();

    this.loadList().finally(() => {
      loading.dismiss();
    });
  }

  openRecipe(id: string): void {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(id));
  }

  parseCategoryTitle(title: string) {
    if (title.startsWith("::")) {
      const i18nKey = title.substring(2);
      const i18nStr = categoryTitlesToi18n[i18nKey];

      return this.translate.instant(i18nStr);
    }

    return title;
  }
}
