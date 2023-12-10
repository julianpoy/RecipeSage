import { Component, Input } from "@angular/core";
import { ToastController, PopoverController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { UtilService } from "~/services/util.service";
import {
  PreferencesService,
  AssistantPreferenceKey,
} from "~/services/preferences.service";

@Component({
  selector: "page-assistant-popover",
  templateUrl: "assistant-popover.page.html",
  styleUrls: ["assistant-popover.page.scss"],
})
export class AssistantPopoverPage {
  preferences = this.preferencesService.preferences;
  preferenceKeys = AssistantPreferenceKey;

  constructor(
    private translate: TranslateService,
    private popoverCtrl: PopoverController,
    private toastCtrl: ToastController,
    private utilService: UtilService,
    private preferencesService: PreferencesService,
  ) {}

  savePreferences() {
    this.preferencesService.save();

    this.dismiss();
  }

  dismiss() {
    this.popoverCtrl.dismiss();
  }
}
