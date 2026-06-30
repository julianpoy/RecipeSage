import { Component, inject } from "@angular/core";
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from "@ionic/angular/standalone";
import type { RecipeSummary } from "@recipesage/prisma";
import { closeOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { SelectRecipeComponent } from "../select-recipe/select-recipe.component";

@Component({
  standalone: true,
  selector: "select-recipe-modal",
  templateUrl: "select-recipe-modal.component.html",
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    SelectRecipeComponent,
  ],
})
export class SelectRecipeModalComponent {
  private modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ closeOutline });
  }

  onSelect(recipe: RecipeSummary) {
    this.modalCtrl.dismiss(recipe);
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
