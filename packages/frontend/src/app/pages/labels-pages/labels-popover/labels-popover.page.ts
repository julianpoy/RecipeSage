import { Component, Input, inject } from "@angular/core";
import { PopoverController } from "@ionic/angular";

import { UtilService } from "~/services/util.service";
import {
  QuickTutorialService,
  QuickTutorialOptions,
} from "~/services/quick-tutorial.service";
import { PreferencesService } from "~/services/preferences.service";
import { ManageLabelsPreferenceKey } from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "page-labels-popover",
  templateUrl: "labels-popover.page.html",
  styleUrls: ["labels-popover.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class LabelsPopoverPage {
  popoverCtrl = inject(PopoverController);
  utilService = inject(UtilService);
  preferencesService = inject(PreferencesService);
  quickTutorialService = inject(QuickTutorialService);

  preferences = this.preferencesService.preferences;
  preferenceKeys = ManageLabelsPreferenceKey;

  @Input() labels: any;

  @Input({
    required: true,
  })
  selectionMode!: boolean;

  toggleSelectionMode() {
    const enteringSelectionMode = !this.selectionMode;
    if (enteringSelectionMode) {
      this.quickTutorialService.triggerQuickTutorial(
        QuickTutorialOptions.MultipleLabelSelection,
      );
    }

    this.popoverCtrl.dismiss({
      selectionMode: enteringSelectionMode,
    });
  }

  savePreferences() {
    this.preferencesService.save();

    this.popoverCtrl.dismiss();
  }
}
