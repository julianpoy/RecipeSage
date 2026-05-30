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
import { close } from "ionicons/icons";
import { addIcons } from "ionicons";

import { SHARED_UI_IMPORTS } from "../../../../providers/shared-ui.provider";
import { SelectRecipeComponent } from "../../../../components/select-recipe/select-recipe.component";

@Component({
  standalone: true,
  selector: "page-cookbook-add-recipe-modal",
  templateUrl: "add-recipe-modal.component.html",
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
export class CookbookAddRecipeModalComponent {
  private modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ close });
  }

  onSelect(recipe: RecipeSummary) {
    this.modalCtrl.dismiss(recipe);
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
