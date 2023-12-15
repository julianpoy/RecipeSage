import { Component, Input } from "@angular/core";
import { PopoverController } from "@ionic/angular";

import { UtilService } from "~/services/util.service";
import {
  QuickTutorialService,
  QuickTutorialOptions,
} from "~/services/quick-tutorial.service";
import { PreferencesService } from "~/services/preferences.service";
import { ManageLabelsPreferenceKey } from "@recipesage/util";

@Component({
  selector: "page-labels-popover",
  templateUrl: "labels-popover.page.html",
  styleUrls: ["labels-popover.page.scss"],
})
export class LabelsPopoverPage {
  preferences = this.preferencesService.preferences;
  preferenceKeys = ManageLabelsPreferenceKey;

  @Input() labels: any;

  @Input({
    required: true,
  })
  selectionMode!: boolean;

  constructor(
    public popoverCtrl: PopoverController,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
    public quickTutorialService: QuickTutorialService,
  ) {}

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
