import { Component, Input, inject } from "@angular/core";
import { PopoverController } from "@ionic/angular/standalone";

import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CookingToolbarService } from "../../../services/cooking-toolbar.service";
import { PreferencesService } from "../../../services/preferences.service";
import { WakeLockService } from "../../../services/wakelock.service";
import { RecipeDetailsPreferenceKey } from "@recipesage/util/shared";
import {
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonToggle,
  IonButton,
  IonIcon,
} from "@ionic/angular/standalone";
import {
  create,
  eye,
  flag,
  pin,
  restaurant,
  share,
  trash,
} from "ionicons/icons";
import { addIcons } from "ionicons";

export type DiscoverRecipePopoverAction =
  | "edit"
  | "unpublish"
  | "pin"
  | "unpin"
  | "enterCookMode"
  | "updateWakeLock"
  | "share"
  | "report";

@Component({
  standalone: true,
  selector: "page-discover-recipe-popover",
  templateUrl: "discover-recipe-popover.page.html",
  styleUrls: ["discover-recipe-popover.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonToggle,
    IonButton,
    IonIcon,
  ],
})
export class DiscoverRecipePopoverPage {
  private popoverCtrl = inject(PopoverController);
  private preferencesService = inject(PreferencesService);
  private wakeLockService = inject(WakeLockService);
  cookingToolbarService = inject(CookingToolbarService);

  @Input({ required: true }) recipeId!: string;
  @Input() isAuthor = false;

  preferences = this.preferencesService.preferences;
  preferenceKeys = RecipeDetailsPreferenceKey;

  wakeLockCapable: boolean;

  constructor() {
    addIcons({ create, eye, flag, pin, restaurant, share, trash });
    this.wakeLockCapable = this.wakeLockService.isCapable;
  }

  savePreferences() {
    this.preferencesService.save();
  }

  closeWithAction(action: DiscoverRecipePopoverAction) {
    this.popoverCtrl.dismiss({
      action,
    });
  }
}
