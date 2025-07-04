import { Component, Input, inject } from "@angular/core";
import { PopoverController } from "@ionic/angular";
import { PreferencesService } from "~/services/preferences.service";
import { RecipeDetailsPreferenceKey } from "@recipesage/util/shared";
import { WakeLockService } from "~/services/wakelock.service";
import { CookingToolbarService } from "~/services/cooking-toolbar.service";
import type { RecipeSummary, UserPublic } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

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
  | "updateWakeLock";

@Component({
  selector: "page-recipe-details-popover",
  templateUrl: "recipe-details-popover.page.html",
  styleUrls: ["recipe-details-popover.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
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

  wakeLockCapable: boolean;

  constructor() {
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
