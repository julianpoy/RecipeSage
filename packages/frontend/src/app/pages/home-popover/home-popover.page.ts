import { Component, Input } from "@angular/core";
import { ToastController, PopoverController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { UtilService } from "~/services/util.service";
import {
  QuickTutorialService,
  QuickTutorialOptions,
} from "~/services/quick-tutorial.service";
import { PreferencesService } from "~/services/preferences.service";
import { MyRecipesPreferenceKey } from "@recipesage/util";

@Component({
  selector: "page-home-popover",
  templateUrl: "home-popover.page.html",
  styleUrls: ["home-popover.page.scss"],
})
export class HomePopoverPage {
  preferences = this.preferencesService.preferences;
  preferenceKeys = MyRecipesPreferenceKey;

  @Input({
    required: true,
  })
  selectionMode!: boolean;

  @Input({
    required: true,
  })
  guestMode!: boolean;

  constructor(
    public translate: TranslateService,
    public popoverCtrl: PopoverController,
    public toastCtrl: ToastController,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
    public quickTutorialService: QuickTutorialService,
  ) {}

  toggleSelectionMode() {
    const enteringSelectionMode = !this.selectionMode;
    if (enteringSelectionMode) {
      this.quickTutorialService.triggerQuickTutorial(
        QuickTutorialOptions.MultipleRecipeSelection,
      );
    }

    this.popoverCtrl.dismiss({
      selectionMode: enteringSelectionMode,
    });
  }

  savePreferences(refreshSearch?: boolean) {
    this.preferencesService.save();

    this.dismiss(refreshSearch);
  }

  dismiss(refreshSearch?: boolean) {
    this.popoverCtrl.dismiss({
      refreshSearch,
    });
  }
}
