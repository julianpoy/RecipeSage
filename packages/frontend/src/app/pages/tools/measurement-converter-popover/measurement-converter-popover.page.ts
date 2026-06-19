import { Component, inject, type OnInit } from "@angular/core";
import {
  IonList,
  IonListHeader,
  IonItem,
  IonSelect,
  IonSelectOption,
} from "@ionic/angular/standalone";
import {
  MeasurementConverterPreferenceKey,
  VOLUME_UNITS,
  WEIGHT_UNITS,
} from "@recipesage/util/shared";

import { PreferencesService } from "../../../services/preferences.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "page-measurement-converter-popover",
  templateUrl: "measurement-converter-popover.page.html",
  styleUrls: ["measurement-converter-popover.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonList,
    IonListHeader,
    IonItem,
    IonSelect,
    IonSelectOption,
  ],
})
export class MeasurementConverterPopoverPage implements OnInit {
  private preferencesService = inject(PreferencesService);

  preferences = this.preferencesService.preferences;

  volumeUnits = VOLUME_UNITS;
  weightUnits = WEIGHT_UNITS;

  selectedVolumeUnits: string[] = [];
  selectedWeightUnits: string[] = [];

  ngOnInit() {
    const enabledUnits =
      this.preferences[MeasurementConverterPreferenceKey.EnabledUnits];
    this.selectedVolumeUnits = this.volumeUnits.filter((unit) =>
      enabledUnits.includes(unit),
    );
    this.selectedWeightUnits = this.weightUnits.filter((unit) =>
      enabledUnits.includes(unit),
    );
  }

  saveUnits() {
    this.preferences[MeasurementConverterPreferenceKey.EnabledUnits] = [
      ...this.volumeUnits.filter((unit) =>
        this.selectedVolumeUnits.includes(unit),
      ),
      ...this.weightUnits.filter((unit) =>
        this.selectedWeightUnits.includes(unit),
      ),
    ];
    this.savePreferences();
  }

  savePreferences() {
    this.preferencesService.save();
  }
}
