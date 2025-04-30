import { Component, ViewChildren, QueryList } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  NavController,
  ToastController,
  ModalController,
  PopoverController,
  AlertController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import {
  CdkDropList,
  CdkDragDrop,
  DragDropModule,
} from "@angular/cdk/drag-drop";

import { LoadingService } from "~/services/loading.service";
import {
  ShoppingList,
  ShoppingListService,
  ShoppingListItem,
} from "~/services/shopping-list.service";
import { WebsocketService } from "~/services/websocket.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { PreferencesService } from "~/services/preferences.service";
import { ShoppingListPreferenceKey } from "@recipesage/util/shared";
import { getShoppingListItemGroupings } from "@recipesage/util/shared";

import { NewShoppingListItemModalPage } from "../new-shopping-list-item-modal/new-shopping-list-item-modal.page";
import { ShoppingListPopoverPage } from "../shopping-list-popover/shopping-list-popover.page";
import { Title } from "@angular/platform-browser";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { ShoppingListItemComponent } from "../../../components/shopping-list-item/shopping-list-item.component";
import { ShoppingListGroupComponent } from "../../../components/shopping-list-group/shopping-list-group.component";
import { NullStateComponent } from "../../../components/null-state/null-state.component";

@Component({
  selector: "page-shopping-list",
  templateUrl: "shopping-list.page.html",
  styleUrls: ["shopping-list.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    ShoppingListItemComponent,
    ShoppingListGroupComponent,
    NullStateComponent,
    DragDropModule,
  ],
})
export class ShoppingListPage {
  defaultBackHref: string = RouteMap.ShoppingListsPage.getPath();

  @ViewChildren(CdkDropList) dropLists!: QueryList<CdkDropList>;

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
  editMode = false;
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
    private titleService: Title,
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

  async setPageTitle(list?: ShoppingList) {
    const title = await this.translate
      .get("generic.labeledPageTitle", {
        title: list?.title,
      })
      .toPromise();
    this.titleService.setTitle(title);
  }

  processList(list?: ShoppingList) {
    if (list) this.list = list;
    if (!this.list) return;

    this.setPageTitle(list);

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
    if (!this.list || this.editMode) return;

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
        editMode: this.editMode,
      },
      event,
    });

    await popover.present();
    const { data } = await popover.onDidDismiss();

    if (data && data.editMode !== undefined) {
      this.editMode = data.editMode;
      if (this.editMode) {
        this.setupDropListConnections();
      }
    }

    const loading = this.loadingService.start();

    this.loadList().finally(() => {
      loading.dismiss();
    });
  }

  openRecipe(id: string): void {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(id));
  }

  setupDropListConnections() {
    if (!this.dropLists || this.dropLists.length === 0) {
      console.warn("No drop lists found.");
      return;
    }

    const dropListArray = this.dropLists.toArray();

    this.dropLists.forEach((dropList) => {
      // Connect each list to all others
      dropList.connectedTo = dropListArray.filter((list) => list !== dropList);
    });
  }

  drop(event: CdkDragDrop<any>) {
    const fromCategory =
      event.previousContainer.element.nativeElement.dataset.categoryTitle;
    const toCategory =
      event.container.element.nativeElement.dataset.categoryTitle;

    if (fromCategory && toCategory && fromCategory !== toCategory) {
      const fromCategoryItems =
        this.itemsByCategoryTitle[fromCategory as string];
      const toCategoryItems =
        this.itemsByCategoryTitle[toCategory as string] || [];
      const draggedItem = fromCategoryItems[event.previousIndex];
      draggedItem.categoryTitle = toCategory;
      this.saveChanges(draggedItem);
      this.setupDropListConnections();
    }
  }

  updateItemArrays() {
    const {
      items: sortedItems,
      groupTitles,
      categoryTitles,
      itemsByGroupTitle,
      itemsByCategoryTitle,
      groupsByCategoryTitle,
    } = getShoppingListItemGroupings(
      this.items,
      this.preferences[ShoppingListPreferenceKey.SortBy],
    );

    this.items = sortedItems;
    this.groupTitles = groupTitles;
    this.categoryTitles = categoryTitles;
    this.itemsByGroupTitle = itemsByGroupTitle;
    this.itemsByCategoryTitle = itemsByCategoryTitle;
    this.groupsByCategoryTitle = groupsByCategoryTitle;
  }

  async saveChanges(item: ShoppingListItem) {
    if (!this.list) return;
    const loading = this.loadingService.start();
    try {
      const itemIds = item.id;
      const categoryTitle = item.categoryTitle;

      const response = await this.shoppingListService.updateItems(
        this.list.id,
        {
          itemIds,
        },
        {
          categoryTitle: categoryTitle,
        },
      );
      loading.dismiss();

      if (!response) return;
      if (this.reference === response.data.reference) return;
      this.reference = response.data.reference;

      await this.loadList();
    } catch (error) {
      console.error("Error saving changes:", error);
      loading.dismiss();
      // Add error handling, such as displaying an error message to the user.
    }
  }
}
