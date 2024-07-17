import { Component, Input } from "@angular/core";
import { PopoverController } from "@ionic/angular";
import { PreferencesService } from "~/services/preferences.service";
import { RecipeDetailsPreferenceKey } from "@recipesage/util/shared";
import { WakeLockService } from "~/services/wakelock.service";
import { CookingToolbarService } from "~/services/cooking-toolbar.service";
import type { RecipeSummary, UserPublic } from "@recipesage/prisma";

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
})
export class RecipeDetailsPopoverPage {
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

  constructor(
    private preferencesService: PreferencesService,
    private wakeLockService: WakeLockService,
    public cookingToolbarService: CookingToolbarService,
    private popoverCtrl: PopoverController,
  ) {
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
