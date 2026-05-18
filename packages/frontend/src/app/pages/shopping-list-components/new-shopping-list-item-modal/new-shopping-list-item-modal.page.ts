import { Component, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";
import { ParsedIngredient } from "../../../services/recipe.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectIngredientsComponent } from "../../../components/select-ingredients/select-ingredients.component";
import { SelectRecipeComponent } from "../../../components/select-recipe/select-recipe.component";
import type { RecipeSummary } from "@recipesage/prisma";
import { SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT } from "@recipesage/util/shared";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonItem,
  IonInput,
  IonFooter,
  IonLabel,
} from "@ionic/angular/standalone";
import { close, list } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-new-shopping-list-item-modal",
  templateUrl: "new-shopping-list-item-modal.page.html",
  styleUrls: ["new-shopping-list-item-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectIngredientsComponent,
    SelectRecipeComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonItem,
    IonInput,
    IonFooter,
    IonLabel,
  ],
})
export class NewShoppingListItemModalPage {
  constructor() {
    addIcons({ close, list });
  }

  private modalCtrl = inject(ModalController);

  inputType = "items";

  readonly titleMaxLength = SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT;

  itemFields: { title?: string }[] = [{}];

  selectedRecipe: RecipeSummary | undefined;
  selectedIngredients: ParsedIngredient[] = [];

  inputTypeChanged(event: any) {
    this.inputType = event.detail.value;
  }

  addOrRemoveTextFields() {
    if ((this.itemFields[this.itemFields.length - 1].title || "").length > 0) {
      this.itemFields.push({});
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
      for (const itemField of this.itemFields) {
        if (itemField.title) return true;
      }
    }
    return false;
  }

  save() {
    let items;
    if (this.inputType === "recipe") {
      if (!this.selectedRecipe) return;

      items = this.selectedIngredients.map((ingredient) => ({
        title: ingredient.plaintextContent.slice(0, this.titleMaxLength),
        completed: false,
        recipeId: this.selectedRecipe?.id || null,
      }));
    } else {
      // Redundant for now. Kept for sterilization
      items = this.itemFields
        .filter((e) => {
          return (e.title || "").length > 0;
        })
        .map((e) => {
          return {
            title: e.title,
            completed: false,
            recipeId: null,
          };
        });
    }

    this.modalCtrl.dismiss({
      items,
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
