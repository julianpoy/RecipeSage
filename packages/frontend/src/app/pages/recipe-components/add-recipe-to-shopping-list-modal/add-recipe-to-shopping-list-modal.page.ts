import { Component, Input, inject } from "@angular/core";
import {
  NavController,
  ToastController,
  ModalController,
  AlertController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "~/services/loading.service";
import { RecipeService, ParsedIngredient } from "~/services/recipe.service";
import { UtilService } from "~/services/util.service";
import { NewShoppingListModalPage } from "~/pages/shopping-list-components/new-shopping-list-modal/new-shopping-list-modal.page";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectIngredientsComponent } from "../../../components/select-ingredients/select-ingredients.component";
import { TRPCService } from "../../../services/trpc.service";
import type { RecipeSummary, ShoppingListSummary } from "@recipesage/prisma";

@Component({
  selector: "page-add-recipe-to-shopping-list-modal",
  templateUrl: "add-recipe-to-shopping-list-modal.page.html",
  styleUrls: ["add-recipe-to-shopping-list-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectIngredientsComponent],
})
export class AddRecipeToShoppingListModalPage {
  navCtrl = inject(NavController);
  translate = inject(TranslateService);
  recipeService = inject(RecipeService);
  loadingService = inject(LoadingService);
  utilService = inject(UtilService);
  toastCtrl = inject(ToastController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);
  trpcService = inject(TRPCService);

  @Input({
    required: true,
  })
  recipes!: Pick<RecipeSummary, "id" | "title" | "ingredients">[];
  @Input() scale = 1;
  selectedIngredientsByRecipe: { [key: string]: ParsedIngredient[] } = {};
  selectedIngredients: ParsedIngredient[] = [];

  shoppingLists?: ShoppingListSummary[];

  destinationShoppingList?: ShoppingListSummary;

  saving = false;

  ionViewWillEnter() {
    const loading = this.loadingService.start();
    this.loadLists().then(
      () => {
        loading.dismiss();
      },
      () => {
        loading.dismiss();
      },
    );
  }

  selectLastUsedShoppingList() {
    if (!this.shoppingLists) return;

    const lastUsedShoppingListId = localStorage.getItem(
      "lastUsedShoppingListId",
    );
    this.destinationShoppingList = this.shoppingLists.find(
      (el) => el.id === lastUsedShoppingListId,
    );
  }

  saveLastUsedShoppingList() {
    if (!this.destinationShoppingList) return;

    localStorage.setItem(
      "lastUsedShoppingListId",
      this.destinationShoppingList.id,
    );
  }

  async loadLists() {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.getShoppingLists.query(),
    );
    if (!response) return;

    this.shoppingLists = response;

    this.selectLastUsedShoppingList();
  }

  selectedIngredientsChange(
    recipeId: string,
    selectedIngredients: ParsedIngredient[],
  ) {
    this.selectedIngredientsByRecipe[recipeId] = selectedIngredients;

    this.selectedIngredients = Object.values(
      this.selectedIngredientsByRecipe,
    ).flat();
  }

  isFormValid() {
    if (!this.destinationShoppingList) return false;

    return this.selectedIngredients && this.selectedIngredients.length > 0;
  }

  async save() {
    if (this.saving) return;
    if (!this.destinationShoppingList) return;

    this.saving = true;
    const loading = this.loadingService.start();

    this.saveLastUsedShoppingList();

    const items = Object.entries(this.selectedIngredientsByRecipe)
      .map(([recipeId, ingredients]) =>
        (ingredients as ParsedIngredient[]).map((ingredient) => ({
          title: ingredient.content,
          recipeId,
        })),
      )
      .flat();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.shoppingLists.createShoppingListItems.mutate({
        shoppingListId: this.destinationShoppingList.id,
        items,
      }),
    );

    this.saving = false;
    loading.dismiss();
    if (!response) return;

    this.modalCtrl.dismiss();
  }

  async createShoppingList() {
    const message = await this.translate
      .get("pages.addRecipeToShoppingListModal.newListSuccess")
      .toPromise();

    const modal = await this.modalCtrl.create({
      component: NewShoppingListModalPage,
      componentProps: {
        openAfterCreate: false,
      },
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.success) return;

      // Check for new lists
      this.loadLists().then(async () => {
        if (this.shoppingLists?.length === 1) {
          this.destinationShoppingList = this.shoppingLists[0];
        } else {
          (
            await this.toastCtrl.create({
              message,
              duration: 6000,
            })
          ).present();
        }
      });
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
