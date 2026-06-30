import { Input, Component, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";
import { CookingToolbarService } from "../../../services/cooking-toolbar.service";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonCheckbox,
  IonFooter,
} from "@ionic/angular/standalone";
import { closeOutline, pinOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-meal-plan-bulk-pin-modal",
  templateUrl: "meal-plan-bulk-pin-modal.page.html",
  styleUrls: ["meal-plan-bulk-pin-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonLabel,
    IonList,
    IonCheckbox,
    IonFooter,
  ],
})
export class MealPlanBulkPinModalPage {
  private modalCtrl = inject(ModalController);
  private cookingToolbarService = inject(CookingToolbarService);

  @Input({
    required: true,
  })
  mealItems!: MealPlanItemSummary[];

  allSelected = true;
  recipeIdSelectionMap: Record<string, boolean> = {};

  constructor() {
    addIcons({ closeOutline, pinOutline });
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
