import { Component, inject, type OnInit } from "@angular/core";
import {
  NavController,
  ModalController,
  PopoverController,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import {
  INGREDIENT_DENSITIES,
  COUNT_ITEMS,
  VOLUME_UNITS,
  VOLUME_UNITS_COMMON,
  VOLUME_UNITS_EXTRA,
  WEIGHT_UNITS,
  WEIGHT_UNITS_COMMON,
  WEIGHT_UNITS_EXTRA,
  OVEN_TEMPERATURES,
  buildPanel,
  getIngredientByKey,
  getIngredientGramsPerMl,
  volumeToWeight,
  convertWeight,
  isVolumeUnit,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  gasMarkToFahrenheit,
  fahrenheitToGasMark,
  formatFraction,
  formatDecimal,
  parseQuantity,
  MeasurementConverterPreferenceKey,
  type VolumeUnit,
  type WeightUnit,
  type OvenTemperature,
} from "@recipesage/util/shared";
import { addIcons } from "ionicons";
import {
  swapVertical,
  chevronDown,
  chevronUp,
  chevronForward,
  options,
} from "ionicons/icons";

import { RouteMap } from "../../../services/util.service";
import { PreferencesService } from "../../../services/preferences.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  SearchableSelectModalComponent,
  type SearchableSelectOption,
} from "../../../components/searchable-select-modal/searchable-select-modal.component";
import { MeasurementConverterPopoverPage } from "../measurement-converter-popover/measurement-converter-popover.page";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
} from "@ionic/angular/standalone";

type Mode = "ingredients" | "count" | "temperature";

interface IngredientOption {
  key: string;
  name: string;
}

const FRACTION_VOLUME_UNITS: VolumeUnit[] = ["cup", "tablespoon", "teaspoon"];

@Component({
  standalone: true,
  selector: "page-measurement-converter",
  templateUrl: "measurement-converter.page.html",
  styleUrls: ["measurement-converter.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
  ],
})
export class MeasurementConverterPage implements OnInit {
  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private preferencesService = inject(PreferencesService);
  private modalCtrl = inject(ModalController);
  private popoverCtrl = inject(PopoverController);

  defaultBackHref: string = RouteMap.ToolsPage.getPath();

  preferences = this.preferencesService.preferences;
  preferenceKeys = MeasurementConverterPreferenceKey;

  mode: Mode = "ingredients";

  volumeUnitsCommon = VOLUME_UNITS_COMMON;
  volumeUnitsExtra = VOLUME_UNITS_EXTRA;
  weightUnitsCommon = WEIGHT_UNITS_COMMON;
  weightUnitsExtra = WEIGHT_UNITS_EXTRA;
  ovenTemperatures: OvenTemperature[] = OVEN_TEMPERATURES;
  countItems = COUNT_ITEMS;

  volumeExpanded = false;
  weightExpanded = false;

  selectedIngredientKey = "water";
  ingredientOptions: IngredientOption[] = [];

  private activeUnit: VolumeUnit | WeightUnit = "cup";
  volumeValues: Record<VolumeUnit, string> = {
    cup: "",
    tablespoon: "",
    teaspoon: "",
    fluidOunce: "",
    milliliter: "",
    liter: "",
    pint: "",
    quart: "",
    gallon: "",
    deciliter: "",
    centiliter: "",
    imperialCup: "",
    imperialPint: "",
    imperialFluidOunce: "",
  };
  weightValues: Record<WeightUnit, string> = {
    gram: "",
    kilogram: "",
    ounce: "",
    pound: "",
    milligram: "",
    stone: "",
  };

  countItemKey = "egg";
  countQuantity = "1";
  countWeightValues: Record<WeightUnit, string> = {
    gram: "",
    kilogram: "",
    ounce: "",
    pound: "",
    milligram: "",
    stone: "",
  };

  tempCelsius = "177";
  tempFahrenheit = "350";
  tempGasMark = "4";

  constructor() {
    addIcons({
      swapVertical,
      chevronDown,
      chevronUp,
      chevronForward,
      options,
    });
  }

  async openDisplayOptionsPopover(event: Event) {
    const popover = await this.popoverCtrl.create({
      component: MeasurementConverterPopoverPage,
      event,
    });
    await popover.present();
    await popover.onDidDismiss();
    this.recompute();
  }

  ngOnInit() {
    this.ingredientOptions = INGREDIENT_DENSITIES.map((ingredient) => ({
      key: ingredient.key,
      name: this.translate.instant(
        `pages.measurementConverter.ingredients.${ingredient.key}`,
      ),
    })).sort((a, b) => a.name.localeCompare(b.name));

    this.volumeValues.cup = "1";
    this.recompute();
    this.recomputeCount();
  }

  goToTools() {
    this.navCtrl.navigateForward(RouteMap.ToolsPage.getPath());
  }

  get selectedIngredientName(): string {
    return this.translate.instant(
      `pages.measurementConverter.ingredients.${this.selectedIngredientKey}`,
    );
  }

  get selectedIngredientVaries(): boolean {
    return getIngredientByKey(this.selectedIngredientKey)?.varies ?? false;
  }

  get basisGrams(): string {
    const gramsPerMl = this.currentGramsPerMl();
    if (gramsPerMl === null) return "";
    return formatDecimal(volumeToWeight(1, "cup", "gram", gramsPerMl));
  }

  async openIngredientPicker() {
    const modal = await this.modalCtrl.create({
      component: SearchableSelectModalComponent,
      componentProps: {
        title: this.translate.instant(
          "pages.measurementConverter.selectIngredient",
        ),
        searchPlaceholder: this.translate.instant(
          "pages.measurementConverter.searchPlaceholder",
        ),
        noResultsText: this.translate.instant(
          "pages.measurementConverter.noResults",
        ),
        options: this.ingredientOptions.map((option) => ({
          value: option.key,
          label: option.name,
        })),
        selectedValue: this.selectedIngredientKey,
      },
    });
    await modal.present();
    const { data } = await modal.onDidDismiss<SearchableSelectOption>();
    if (!data) return;

    this.selectedIngredientKey = data.value;
    this.recompute();
  }

  private currentGramsPerMl(): number | null {
    const ingredient = getIngredientByKey(this.selectedIngredientKey);
    return ingredient ? getIngredientGramsPerMl(ingredient) : null;
  }

  onVolumeInput(unit: VolumeUnit) {
    this.activeUnit = unit;
    this.recompute();
  }

  onWeightInput(unit: WeightUnit) {
    this.activeUnit = unit;
    this.recompute();
  }

  private recompute() {
    const unit = this.activeUnit;
    const raw = isVolumeUnit(unit)
      ? this.volumeValues[unit]
      : this.weightValues[unit];
    const value = parseQuantity(raw);
    if (value === null) return;

    const panel = buildPanel(value, unit, this.currentGramsPerMl());

    if (panel.volumes) {
      for (const volumeUnit of VOLUME_UNITS) {
        if (volumeUnit === unit) continue;
        this.volumeValues[volumeUnit] = this.formatVolume(
          volumeUnit,
          panel.volumes[volumeUnit],
        );
      }
    }

    if (panel.weights) {
      for (const weightUnit of WEIGHT_UNITS) {
        if (weightUnit === unit) continue;
        this.weightValues[weightUnit] = formatDecimal(
          panel.weights[weightUnit],
        );
      }
    }
  }

  private formatVolume(unit: VolumeUnit, value: number): string {
    const showFractions =
      this.preferences[MeasurementConverterPreferenceKey.ShowFractions];
    if (showFractions && FRACTION_VOLUME_UNITS.includes(unit)) {
      return formatFraction(value);
    }
    return formatDecimal(value);
  }

  get countItemVaries(): boolean {
    return (
      COUNT_ITEMS.find((item) => item.key === this.countItemKey)?.varies ??
      false
    );
  }

  onCountInput() {
    this.recomputeCount();
  }

  onCountWeightInput(unit: WeightUnit) {
    const value = parseQuantity(this.countWeightValues[unit]);
    const item = COUNT_ITEMS.find((entry) => entry.key === this.countItemKey);
    if (value === null || !item) return;

    const grams = convertWeight(value, unit, "gram");
    this.countQuantity = formatDecimal(grams / item.gramsPerUnit);

    for (const weightUnit of WEIGHT_UNITS) {
      if (weightUnit === unit) continue;
      this.countWeightValues[weightUnit] = formatDecimal(
        convertWeight(grams, "gram", weightUnit),
      );
    }
  }

  private recomputeCount() {
    const quantity = parseQuantity(this.countQuantity);
    const item = COUNT_ITEMS.find((entry) => entry.key === this.countItemKey);
    if (quantity === null || !item) return;

    const grams = quantity * item.gramsPerUnit;
    for (const weightUnit of WEIGHT_UNITS) {
      this.countWeightValues[weightUnit] = formatDecimal(
        convertWeight(grams, "gram", weightUnit),
      );
    }
  }

  onTemperatureInput(field: "celsius" | "fahrenheit" | "gasMark") {
    if (field === "celsius") {
      const celsius = parseQuantity(this.tempCelsius);
      if (celsius === null) return;
      const fahrenheit = celsiusToFahrenheit(celsius);
      this.tempFahrenheit = String(Math.round(fahrenheit));
      this.tempGasMark = String(fahrenheitToGasMark(fahrenheit));
    } else if (field === "fahrenheit") {
      const fahrenheit = parseQuantity(this.tempFahrenheit);
      if (fahrenheit === null) return;
      this.tempCelsius = String(Math.round(fahrenheitToCelsius(fahrenheit)));
      this.tempGasMark = String(fahrenheitToGasMark(fahrenheit));
    } else {
      const mark = parseQuantity(this.tempGasMark);
      if (mark === null) return;
      const fahrenheit = gasMarkToFahrenheit(mark);
      this.tempFahrenheit = String(Math.round(fahrenheit));
      this.tempCelsius = String(Math.round(fahrenheitToCelsius(fahrenheit)));
    }
  }
}
