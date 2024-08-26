import { Component } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { ParsedIngredient, type Recipe } from "~/services/recipe.service";

@Component({
  selector: "page-new-shopping-list-item-modal",
  templateUrl: "new-shopping-list-item-modal.page.html",
  styleUrls: ["new-shopping-list-item-modal.page.scss"],
})
export class NewShoppingListItemModalPage {
  inputType = "items";

  itemFields: {
    title: string;
  }[] = [
    {
      title: "",
    },
  ];

  selectedRecipe: Recipe | undefined;
  selectedIngredients: ParsedIngredient[] = [];

  constructor(private modalCtrl: ModalController) {}

  inputTypeChanged(event: any) {
    this.inputType = event.detail.value;
  }

  addOrRemoveTextFields() {
    if (this.itemFields.at(-1)?.title?.length) {
      this.itemFields.push({
        title: "",
      });
    }
  }

  isFormValid() {
    if (
      this.inputType === "recipe" &&
      this.selectedRecipe &&
      this.selectedRecipe.id
    ) {
      return this.selectedIngredients.length > 0;
    }
    if (this.inputType === "items") {
      if (this.itemFields.some((field) => field.title.length)) {
        return true;
      }
    }
    return false;
  }

  save() {
    let items: {
      title: string;
      completed: boolean;
      mealPlanItemId: string | null;
      recipeId: string | null;
    }[];

    if (this.inputType === "recipe") {
      items = this.selectedIngredients.map((ingredient) => ({
        title: ingredient.content,
        recipeId: this.selectedRecipe?.id || null,
        mealPlanItemId: null,
        completed: false,
      }));
    } else {
      items = this.itemFields
        .filter((item) => item.title.length)
        .map((item) => ({
          title: item.title,
          recipeId: null,
          mealPlanItemId: null,
          completed: false,
        }));
    }

    this.modalCtrl.dismiss({
      items,
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
