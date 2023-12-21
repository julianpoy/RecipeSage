import { Component, Input } from "@angular/core";
import { PopoverController } from "@ionic/angular";
import { PreferencesService } from "~/services/preferences.service";
import { RecipeDetailsPreferenceKey } from "@recipesage/util";
import { WakeLockService } from "~/services/wakelock.service";
import { CookingToolbarService } from "~/services/cooking-toolbar.service";

@Component({
  selector: "page-recipe-details-popover",
  templateUrl: "recipe-details-popover.page.html",
  styleUrls: ["recipe-details-popover.page.scss"],
})
export class RecipeDetailsPopoverPage {
  @Input({
    required: true,
  })
  recipeId!: string;

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

  closeWithAction(name: string) {
    this.popoverCtrl.dismiss({
      action: name,
    });
  }
}
