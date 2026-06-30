import { Component, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";

import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectLabelComponent } from "../../../components/select-label/select-label.component";
import { SelectRecipeComponent } from "../../../components/select-recipe/select-recipe.component";
import type {
  LabelSummary,
  ProfileItemSummary,
  ProfileItemType,
  ProfileItemVisibility,
  RecipeSummary,
} from "@recipesage/prisma";
import { type RadioGroupCustomEvent } from "@ionic/angular/standalone";
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
  IonRadioGroup,
  IonRadio,
  IonInput,
  IonFooter,
} from "@ionic/angular/standalone";
import {
  checkmarkOutline,
  closeOutline,
  documentTextOutline,
  eyeOutline,
  folderOpenOutline,
  pricetagOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-add-profile-item-modal",
  templateUrl: "add-profile-item-modal.page.html",
  styleUrls: ["add-profile-item-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectLabelComponent,
    SelectRecipeComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonLabel,
    IonRadioGroup,
    IonRadio,
    IonInput,
    IonFooter,
  ],
})
export class AddProfileItemModalPage {
  constructor() {
    addIcons({
      checkmarkOutline,
      closeOutline,
      documentTextOutline,
      eyeOutline,
      folderOpenOutline,
      pricetagOutline,
    });
  }

  private modalCtrl = inject(ModalController);

  legalHref: string = RouteMap.LegalPage.getPath();

  itemType: ProfileItemType | null = null;

  itemVisibility: ProfileItemVisibility | null = null;

  itemTitle = "";

  selectedRecipe?: RecipeSummary;
  selectedLabel?: LabelSummary;

  onItemTypeChange(event: RadioGroupCustomEvent) {
    this.itemType = event.detail.value;
  }

  onItemVisibilityChange(event: RadioGroupCustomEvent) {
    this.itemVisibility = event.detail.value;
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  done() {
    const {
      itemType,
      itemVisibility,
      itemTitle,
      selectedRecipe,
      selectedLabel,
    } = this;

    if (!itemType || !itemVisibility) return;

    this.modalCtrl.dismiss({
      item: {
        title: itemTitle,
        type: itemType,
        visibility: itemVisibility,
        label: selectedLabel || null,
        recipe: selectedRecipe
          ? {
              id: selectedRecipe.id,
              recipeImages: selectedRecipe.recipeImages,
            }
          : null,
      } satisfies Omit<ProfileItemSummary, "id" | "userId" | "order">,
    });
  }

  isValid() {
    return this.itemTitle && this.itemVisibility && this.isItemSelected();
  }

  isItemSelected() {
    return (
      this.itemType &&
      (this.itemType === "all-recipes" ||
        this.selectedRecipe ||
        this.selectedLabel)
    );
  }
}
