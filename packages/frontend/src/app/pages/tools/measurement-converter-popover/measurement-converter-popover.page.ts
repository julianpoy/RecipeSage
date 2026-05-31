import { Component, inject } from "@angular/core";
import {
  IonList,
  IonListHeader,
  IonItem,
  IonToggle,
} from "@ionic/angular/standalone";
import { MeasurementConverterPreferenceKey } from "@recipesage/util/shared";

import { PreferencesService } from "../../../services/preferences.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "page-measurement-converter-popover",
  templateUrl: "measurement-converter-popover.page.html",
  styleUrls: ["measurement-converter-popover.page.scss"],
  imports: [...SHARED_UI_IMPORTS, IonList, IonListHeader, IonItem, IonToggle],
})
export class MeasurementConverterPopoverPage {
  private preferencesService = inject(PreferencesService);

  preferences = this.preferencesService.preferences;
  preferenceKeys = MeasurementConverterPreferenceKey;

  savePreferences() {
    this.preferencesService.save();
  }
}
