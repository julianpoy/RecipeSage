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

import { addIcons } from "ionicons";
import { reorderThreeOutline } from "ionicons/icons";

import { LoadingService } from "~/services/loading.service";
import { ShoppingListService } from "~/services/shopping-list.service";

import type {
  ShoppingList,
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
import { CollapsibleCategoryComponent } from "../../../components/collapsable-category-component/collapsible-category.component";
import { DraggableShoppingListItemComponent } from "../../../components/draggable-shopping-list-item/draggable-shopping-list-item.component";
import { DraggableShoppingListGroupComponent } from "../../../components/draggable-shopping-list-group/draggable-shopping-list-group.component";
import { ShoppingListItemComponent } from "../../../components/shopping-list-item/shopping-list-item.component";
import { ShoppingListGroupComponent } from "../../../components/shopping-list-group/shopping-list-group.component";
import { NullStateComponent } from "../../../components/null-state/null-state.component";

@Component({
  selector: "page-shopping-list",
  templateUrl: "shopping-list.page.html",
  styleUrls: ["shopping-list.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    DraggableShoppingListItemComponent,
    DraggableShoppingListGroupComponent,
    ShoppingListItemComponent,
    ShoppingListGroupComponent,
    NullStateComponent,
    CollapsibleCategoryComponent,
  ],
})
export class ShoppingListPage {
  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  loadingService = inject(LoadingService);
  shoppingListService = inject(ShoppingListService);
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

  draggedItem: any = null;
  draggedFromCategory: string = "";
  dragOverCategory: string = "";

  constructor() {
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
    addIcons({
      "reorder-three-outline": reorderThreeOutline,
    });
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
    if (!this.editMode) {
      this.loadList().then(
        () => {
          loader.target.complete();
        },
        () => {
          loader.target.complete();
        },
      );
    }
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
      this.editMode,
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
      this.editMode,
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

  onToggleCollapse(categoryTitle: string) {
    this.categoryTitleCollapsed[categoryTitle] =
      !this.categoryTitleCollapsed[categoryTitle];
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
    }

    const loading = this.loadingService.start();

    this.loadList().finally(() => {
      loading.dismiss();
    });
  }

  openRecipe(id: string): void {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(id));
  }

  // add track method to improve performance
  trackByItemId(index: number, item: any): any {
    return item.id;
  }

  onDragStart(event: DragEvent, item: any, categoryTitle: string): void {
    this.draggedItem = item;
    this.draggedFromCategory = categoryTitle;
    event.dataTransfer!.setData(
      "text/plain",
      JSON.stringify({
        itemId: item.id,
        sourceCategory: categoryTitle,
      }),
    );

    event.dataTransfer!.effectAllowed = "move";

    const element = event.target as HTMLElement;
    element.classList.add("dragging");
  }

  onDragEnd(event: DragEvent): void {
    // Clean up visual feedback
    const element = event.target as HTMLElement;
    element.classList.remove("dragging");

    // Clear drag over effects
    document.querySelectorAll(".drag-over").forEach((el) => {
      el.classList.remove("drag-over");
    });

    this.draggedItem = null;
    this.draggedFromCategory = "";
    this.dragOverCategory = "";
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault(); // Allow drop
    event.dataTransfer!.dropEffect = "move";
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    const categoryElement = event.currentTarget as HTMLElement;
    const targetCategory = categoryElement.getAttribute("data-category");

    if (targetCategory && targetCategory !== this.draggedFromCategory) {
      categoryElement.classList.add("drag-over");
      this.dragOverCategory = targetCategory;
    }
  }

  onDragLeave(event: DragEvent): void {
    const categoryElement = event.currentTarget as HTMLElement;
    const rect = categoryElement.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    // Only remove drag-over if we're actually leaving the element
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      categoryElement.classList.remove("drag-over");
    }
  }

  onDrop(event: DragEvent, targetCategory: string): void {
    event.preventDefault();

    // Remove visual feedback
    const categoryElement = event.currentTarget as HTMLElement;
    categoryElement.classList.remove("drag-over");

    // Get drag data
    const dragData = JSON.parse(event.dataTransfer!.getData("text/plain"));
    const sourceCategory = dragData.sourceCategory;
    const itemId = dragData.itemId;

    // Don't do anything if dropped in same category
    if (sourceCategory === targetCategory) {
      return;
    }

    // Find the item
    const item = this.itemsByCategoryTitle[sourceCategory].find(
      (i: any) => i.id === itemId,
    );
    if (!item) {
      return;
    }

    // Move item between categories
    this.moveItemBetweenCategories(item, sourceCategory, targetCategory);
  }

  moveItemBetweenCategories(
    item: any,
    fromCategory: string,
    toCategory: string,
  ): void {
    // Remove from source category
    const fromIndex = this.itemsByCategoryTitle[fromCategory].findIndex(
      (i: any) => i.id === item.id,
    );
    if (fromIndex > -1) {
      this.itemsByCategoryTitle[fromCategory].splice(fromIndex, 1);
    }

    // Add to target category
    if (!this.itemsByCategoryTitle[toCategory]) {
      this.itemsByCategoryTitle[toCategory] = [];
    }
    this.itemsByCategoryTitle[toCategory].push(item);

    item.categoryTitle = toCategory;

    // Call your existing update logic here
    this.updateItemArrays();

    // Optionally trigger save/sync
    this.saveChanges(item);
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
      this.editMode,
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
