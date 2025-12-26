import { Component, Input, inject } from "@angular/core";
import { ToastController, PopoverController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { UtilService } from "~/services/util.service";
import {
  QuickTutorialService,
  QuickTutorialOptions,
} from "~/services/quick-tutorial.service";
import { PreferencesService } from "~/services/preferences.service";
import { MyRecipesPreferenceKey } from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "page-home-popover",
  templateUrl: "home-popover.page.html",
  styleUrls: ["home-popover.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class HomePopoverPage {
  translate = inject(TranslateService);
  popoverCtrl = inject(PopoverController);
  toastCtrl = inject(ToastController);
  utilService = inject(UtilService);
  preferencesService = inject(PreferencesService);
  quickTutorialService = inject(QuickTutorialService);

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
