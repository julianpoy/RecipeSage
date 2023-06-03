import { Input, Component } from "@angular/core";
import {
  NavController,
  ModalController,
  AlertController,
  ToastController,
} from "@ionic/angular";
import { MealPlanService } from "~/services/meal-plan.service";
import { RecipeService } from "~/services/recipe.service";
import { LoadingService } from "~/services/loading.service";
import { CookingToolbarService } from "~/services/cooking-toolbar.service";
import { UtilService, RouteMap } from "~/services/util.service";

@Component({
  selector: "page-meal-plan-bulk-pin-modal",
  templateUrl: "index.html",
  styleUrls: ["index.scss"],
})
export class MealPlanBulkPinModalPage {
  @Input() mealItems;

  allSelected = true;
  recipeIdSelectionMap = {};

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public alertCtrl: AlertController,
    public mealPlanService: MealPlanService,
    public cookingToolbarService: CookingToolbarService,
    public recipeService: RecipeService,
    public loadingService: LoadingService,
    public utilService: UtilService,
    public toastCtrl: ToastController
  ) {
    setTimeout(() => {
      this.selectAllRecipes();
    });
  }

  selectAllRecipes() {
    this.allSelected = true;
    (this.mealItems || [])
      .filter((mealItem) => mealItem.recipe?.id)
      .forEach(
        (mealItem) => (this.recipeIdSelectionMap[mealItem.recipe.id] = true)
      );
  }

  deselectAll() {
    this.allSelected = false;
    Object.keys(this.recipeIdSelectionMap).forEach(
      (recipeId) => (this.recipeIdSelectionMap[recipeId] = false)
    );
  }

  pinRecipes() {
    Object.keys(this.recipeIdSelectionMap).forEach((recipeId) => {
      if (!this.recipeIdSelectionMap[recipeId]) return;
      const mealItem = this.mealItems.find(
        (item) => item.recipe?.id === recipeId
      );

      if (mealItem) {
        this.cookingToolbarService.pinRecipe({
          id: mealItem.recipe.id,
          title: mealItem.recipe.title,
          imageUrl: mealItem.recipe.images[0]?.location,
        });
      }
    });
  }

  close(args?) {
    this.modalCtrl.dismiss(args);
  }
}
