import { Component, Input, inject } from "@angular/core";
import { PopoverController } from "@ionic/angular/standalone";
import { PreferencesService } from "../../../services/preferences.service";
import { RecipeDetailsPreferenceKey } from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  IonList,
  IonListHeader,
  IonButton,
  IonIcon,
} from "@ionic/angular/standalone";
import { imageOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-edit-recipe-popover",
  templateUrl: "edit-recipe-popover.page.html",
  styleUrls: ["edit-recipe-popover.page.scss"],
  imports: [...SHARED_UI_IMPORTS, IonList, IonListHeader, IonButton, IonIcon],
})
export class EditRecipePopoverPage {
  constructor() {
    addIcons({ imageOutline });
  }

  private preferencesService = inject(PreferencesService);
  private popoverCtrl = inject(PopoverController);

  preferences = this.preferencesService.preferences;
  preferenceKeys = RecipeDetailsPreferenceKey;

  @Input({
    required: true,
  })
  canAddImages!: boolean;
  @Input({
    required: true,
  })
  addImageByUrlPrompt!: () => void;

  savePreferences() {
    this.preferencesService.save();
  }

  dismiss() {
    this.popoverCtrl.dismiss();
  }
}
