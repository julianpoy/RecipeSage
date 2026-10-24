import {
  Component,
  Input,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { PopoverController } from "@ionic/angular";

import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CookingToolbarService } from "../../../services/cooking-toolbar.service";
import { PreferencesService } from "../../../services/preferences.service";
import { WakeLockService } from "../../../services/wakelock.service";
import {
  RecipeDetailsPreferenceKey,
  RecipeDetailsSmallScreenLayoutOptions,
} from "@recipesage/util/shared";
import {
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonToggle,
  IonIcon,
  IonSelect,
  IonSelectOption,
} from "@ionic/angular";
import {
  createOutline,
  eyeOutline,
  flagOutline,
  phonePortraitOutline,
  pinOutline,
  restaurantOutline,
  shareOutline,
  trashOutline,
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
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ...SHARED_UI_IMPORTS,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonToggle,
    IonIcon,
    IonSelect,
    IonSelectOption,
  ],
})
export class DiscoverRecipePopoverPage {
  private popoverCtrl = inject(PopoverController);
  private preferencesService = inject(PreferencesService);
  private wakeLockService = inject(WakeLockService);
  cookingToolbarService = inject(CookingToolbarService);

  @Input({ required: true }) recipeId!: string;
  @Input() isAuthor = false;
  @Input() isSmallScreen = false;

  preferences = this.preferencesService.preferences;
  preferenceKeys = RecipeDetailsPreferenceKey;
  smallScreenLayoutOptions = RecipeDetailsSmallScreenLayoutOptions;

  wakeLockCapable: boolean;

  constructor() {
    addIcons({
      createOutline,
      eyeOutline,
      flagOutline,
      phonePortraitOutline,
      pinOutline,
      restaurantOutline,
      shareOutline,
      trashOutline,
    });
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
