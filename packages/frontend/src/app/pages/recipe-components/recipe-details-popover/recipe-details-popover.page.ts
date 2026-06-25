import { Component, Input, inject } from "@angular/core";
import { PopoverController } from "@ionic/angular/standalone";
import { PreferencesService } from "../../../services/preferences.service";
import { RecipeDetailsPreferenceKey } from "@recipesage/util/shared";
import { WakeLockService } from "../../../services/wakelock.service";
import { CookingToolbarService } from "../../../services/cooking-toolbar.service";
import type { RecipeSummary, UserPublic } from "@recipesage/prisma";
import { IS_SELFHOST } from "../../../../environments/environment";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  IonList,
  IonListHeader,
  IonItem,
  IonIcon,
  IonToggle,
  IonButton,
  IonLabel,
} from "@ionic/angular/standalone";
import {
  calendar,
  cloudDownload,
  compass,
  copy,
  create,
  eye,
  list,
  pin,
  print,
  restaurant,
  share,
  trash,
} from "ionicons/icons";
import { addIcons } from "ionicons";

export type RecipeDetailsPopoverActionTypes =
  | "delete"
  | "clone"
  | "authAndClone"
  | "addToShoppingList"
  | "addToMealPlan"
  | "moveToMain"
  | "share"
  | "print"
  | "pin"
  | "unpin"
  | "edit"
  | "updateWakeLock"
  | "enterCookMode"
  | "setLastMadeToday"
  | "publishToDiscover";

@Component({
  standalone: true,
  selector: "page-recipe-details-popover",
  templateUrl: "recipe-details-popover.page.html",
  styleUrls: ["recipe-details-popover.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonList,
    IonListHeader,
    IonItem,
    IonIcon,
    IonToggle,
    IonButton,
    IonLabel,
  ],
})
export class RecipeDetailsPopoverPage {
  private preferencesService = inject(PreferencesService);
  private wakeLockService = inject(WakeLockService);
  cookingToolbarService = inject(CookingToolbarService);
  private popoverCtrl = inject(PopoverController);

  @Input({
    required: true,
  })
  recipe!: RecipeSummary;
  @Input({
    required: true,
  })
  me: UserPublic | null = null;
  @Input({
    required: true,
  })
  isLoggedIn!: boolean;

  preferences = this.preferencesService.preferences;
  preferenceKeys = RecipeDetailsPreferenceKey;
  isSelfHost = IS_SELFHOST;

  wakeLockCapable: boolean;

  constructor() {
    addIcons({
      calendar,
      cloudDownload,
      compass,
      copy,
      create,
      eye,
      list,
      pin,
      print,
      restaurant,
      share,
      trash,
    });
    this.wakeLockCapable = this.wakeLockService.isCapable;
  }

  savePreferences() {
    this.preferencesService.save();
  }

  closeWithAction(name: RecipeDetailsPopoverActionTypes) {
    this.popoverCtrl.dismiss({
      action: name,
    });
  }
}
