import { Input, Component, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  AlertController,
  ToastController,
} from "@ionic/angular";
import { MealPlanItem, MealPlanService } from "~/services/meal-plan.service";
import { RecipeService } from "~/services/recipe.service";
import { LoadingService } from "~/services/loading.service";
import { CookingToolbarService } from "~/services/cooking-toolbar.service";
import { UtilService } from "~/services/util.service";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  selector: "page-meal-plan-bulk-pin-modal",
  templateUrl: "meal-plan-bulk-pin-modal.page.html",
  styleUrls: ["meal-plan-bulk-pin-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class MealPlanBulkPinModalPage {
  navCtrl = inject(NavController);
  modalCtrl = inject(ModalController);
  alertCtrl = inject(AlertController);
  mealPlanService = inject(MealPlanService);
  cookingToolbarService = inject(CookingToolbarService);
  recipeService = inject(RecipeService);
  loadingService = inject(LoadingService);
  utilService = inject(UtilService);
  toastCtrl = inject(ToastController);

  @Input({
    required: true,
  })
  mealItems!: MealPlanItemSummary[];

  allSelected = true;
  recipeIdSelectionMap: Record<string, boolean> = {};

  constructor() {
    setTimeout(() => {
      this.selectAllRecipes();
    });
  }

  selectAllRecipes() {
    this.allSelected = true;
    this.mealItems
      .map((mealItem) => mealItem.recipe)
      .filter((recipe): recipe is Exclude<typeof recipe, null> => !!recipe)
      .forEach((recipe) => (this.recipeIdSelectionMap[recipe.id] = true));
  }

  deselectAll() {
    this.allSelected = false;
    Object.keys(this.recipeIdSelectionMap).forEach(
      (recipeId) => (this.recipeIdSelectionMap[recipeId] = false),
    );
  }

  pinRecipes() {
    Object.keys(this.recipeIdSelectionMap).forEach((recipeId) => {
      if (!this.recipeIdSelectionMap[recipeId]) return;
      const mealItem = this.mealItems.find(
        (item) => item.recipe?.id === recipeId,
      );

      if (mealItem && mealItem.recipe) {
        this.cookingToolbarService.pinRecipe({
          id: mealItem.recipe.id,
          title: mealItem.recipe.title,
          imageUrl: mealItem.recipe.recipeImages.at(0)?.image.location,
        });
      }
    });
  }

  checkboxChanged(event: any, recipeId: string) {
    this.recipeIdSelectionMap[recipeId] = event.detail.value;
  }

  close(args?: any) {
    this.modalCtrl.dismiss(args);
  }
}
