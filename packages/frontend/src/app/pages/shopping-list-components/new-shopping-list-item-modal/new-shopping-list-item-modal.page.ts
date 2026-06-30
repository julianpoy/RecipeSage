import { Component, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectIngredientsComponent } from "../../../components/select-ingredients/select-ingredients.component";
import { SelectRecipeComponent } from "../../../components/select-recipe/select-recipe.component";
import { TextAreaComponent } from "../../../components/forms/text-area/text-area.component";
import type { RecipeSummary } from "@recipesage/prisma";
import {
  SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT,
  ParsedIngredient,
} from "@recipesage/util/shared";
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
  IonFooter,
  IonLabel,
} from "@ionic/angular/standalone";
import { closeOutline, listOutline } from "ionicons/icons";
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
    IonFooter,
    IonLabel,
    TextAreaComponent,
  ],
})
export class NewShoppingListItemModalPage {
  constructor() {
    addIcons({ closeOutline, listOutline });
  }

  private modalCtrl = inject(ModalController);

  inputType = "items";

  readonly titleMaxLength = SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT;

  itemsText = "";

  selectedRecipe: RecipeSummary | undefined;
  selectedIngredients: ParsedIngredient[] = [];

  inputTypeChanged(event: any) {
    this.inputType = event.detail.value;
  }

  parseItemTitles() {
    return this.itemsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
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
      return this.parseItemTitles().length > 0;
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
      items = this.parseItemTitles().map((title) => {
        return {
          title: title.slice(0, this.titleMaxLength),
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
