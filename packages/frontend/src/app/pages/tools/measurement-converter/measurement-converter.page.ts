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
  WEIGHT_UNITS,
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
  swapVerticalOutline,
  chevronForwardOutline,
  optionsOutline,
  bulbOutline,
} from "ionicons/icons";

import { RouteMap, UtilService } from "../../../services/util.service";
import { PreferencesService } from "../../../services/preferences.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { InfoBlockComponent } from "../../../components/info-block/info-block.component";
import {
  SearchableSelectModalComponent,
  type SearchableSelectOption,
} from "../../../components/searchable-select-modal/searchable-select-modal.component";
import { MeasurementConverterPopoverPage } from "../measurement-converter-popover/measurement-converter-popover.page";
import { TextInputComponent } from "../../../components/forms/text-input/text-input.component";
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
  IonButton,
  IonIcon,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
} from "@ionic/angular/standalone";

type Mode = "ingredients" | "count" | "temperature";

const FRACTION_VOLUME_UNITS: VolumeUnit[] = ["cup", "tablespoon", "teaspoon"];

const SHORT_UNIT_KEYS: Record<string, string> = {
  cup: "pages.measurementConverter.unitsShort.cup",
  tablespoon: "pages.measurementConverter.unitsShort.tablespoon",
  teaspoon: "pages.measurementConverter.unitsShort.teaspoon",
  fluidOunce: "pages.measurementConverter.unitsShort.fluidOunce",
  milliliter: "pages.measurementConverter.unitsShort.milliliter",
  liter: "pages.measurementConverter.unitsShort.liter",
  pint: "pages.measurementConverter.unitsShort.pint",
  quart: "pages.measurementConverter.unitsShort.quart",
  gallon: "pages.measurementConverter.unitsShort.gallon",
  deciliter: "pages.measurementConverter.unitsShort.deciliter",
  centiliter: "pages.measurementConverter.unitsShort.centiliter",
  imperialCup: "pages.measurementConverter.unitsShort.imperialCup",
  imperialPint: "pages.measurementConverter.unitsShort.imperialPint",
  imperialFluidOunce:
    "pages.measurementConverter.unitsShort.imperialFluidOunce",
  gram: "pages.measurementConverter.unitsShort.gram",
  kilogram: "pages.measurementConverter.unitsShort.kilogram",
  ounce: "pages.measurementConverter.unitsShort.ounce",
  pound: "pages.measurementConverter.unitsShort.pound",
  milligram: "pages.measurementConverter.unitsShort.milligram",
  stone: "pages.measurementConverter.unitsShort.stone",
  fahrenheit: "pages.measurementConverter.unitsShort.fahrenheit",
  celsius: "pages.measurementConverter.unitsShort.celsius",
};

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
    IonButton,
    IonIcon,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    InfoBlockComponent,
    TextInputComponent,
  ],
})
export class MeasurementConverterPage implements OnInit {
  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private utilService = inject(UtilService);
  private preferencesService = inject(PreferencesService);
  private modalCtrl = inject(ModalController);
  private popoverCtrl = inject(PopoverController);

  defaultBackHref: string = RouteMap.ToolsPage.getPath();

  preferences = this.preferencesService.preferences;

  mode: Mode = "ingredients";

  ovenTemperatures: OvenTemperature[] = OVEN_TEMPERATURES;
  countItems = COUNT_ITEMS;

  selectedIngredientKey = "water";

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
      swapVerticalOutline,
      chevronForwardOutline,
      optionsOutline,
      bulbOutline,
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
    this.volumeValues.cup = "1";
    this.recompute();
    this.recomputeCount();
  }

  goToTools() {
    this.navCtrl.navigateForward(RouteMap.ToolsPage.getPath());
  }

  private get enabledUnits(): string[] {
    return this.preferences[MeasurementConverterPreferenceKey.EnabledUnits];
  }

  get visibleVolumeUnits(): VolumeUnit[] {
    return VOLUME_UNITS.filter((unit) => this.enabledUnits.includes(unit));
  }

  get visibleWeightUnits(): WeightUnit[] {
    return WEIGHT_UNITS.filter((unit) => this.enabledUnits.includes(unit));
  }

  shortUnitLabel(unit: string): string {
    const key = SHORT_UNIT_KEYS[unit];
    return key ? this.translate.instant(key) : "";
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
    return formatDecimal(
      volumeToWeight(1, "cup", "gram", gramsPerMl),
      this.utilService.getCurrentLocale(),
    );
  }

  async openIngredientPicker() {
    await this.translate
      .get("pages.measurementConverter.selectIngredient")
      .toPromise();

    const options = INGREDIENT_DENSITIES.map((ingredient) => ({
      value: ingredient.key,
      label: this.translate.instant(
        `pages.measurementConverter.ingredients.${ingredient.key}`,
      ),
    })).sort((a, b) => a.label.localeCompare(b.label));

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
        options,
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
    const value = parseQuantity(raw, this.utilService.getCurrentLocale());
    if (value === null && raw.trim().length > 0) return;

    const panel =
      value === null || value <= 0
        ? null
        : buildPanel(value, unit, this.currentGramsPerMl());

    for (const volumeUnit of VOLUME_UNITS) {
      if (volumeUnit === unit) continue;
      this.volumeValues[volumeUnit] = panel?.volumes
        ? this.formatVolume(volumeUnit, panel.volumes[volumeUnit])
        : "";
    }

    for (const weightUnit of WEIGHT_UNITS) {
      if (weightUnit === unit) continue;
      this.weightValues[weightUnit] = panel?.weights
        ? formatDecimal(
            panel.weights[weightUnit],
            this.utilService.getCurrentLocale(),
          )
        : "";
    }
  }

  private formatVolume(unit: VolumeUnit, value: number): string {
    if (FRACTION_VOLUME_UNITS.includes(unit)) {
      return formatFraction(value, this.utilService.getCurrentLocale());
    }
    return formatDecimal(value, this.utilService.getCurrentLocale());
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
    const raw = this.countWeightValues[unit];
    const value = parseQuantity(raw, this.utilService.getCurrentLocale());
    if (value === null && raw.trim().length > 0) return;

    const item = COUNT_ITEMS.find((entry) => entry.key === this.countItemKey);
    const grams =
      value === null || value <= 0 || !item
        ? null
        : convertWeight(value, unit, "gram");

    this.countQuantity =
      grams === null || !item
        ? ""
        : formatDecimal(
            grams / item.gramsPerUnit,
            this.utilService.getCurrentLocale(),
          );

    for (const weightUnit of WEIGHT_UNITS) {
      if (weightUnit === unit) continue;
      this.countWeightValues[weightUnit] =
        grams === null
          ? ""
          : formatDecimal(
              convertWeight(grams, "gram", weightUnit),
              this.utilService.getCurrentLocale(),
            );
    }
  }

  private recomputeCount() {
    const raw = this.countQuantity;
    const quantity = parseQuantity(raw, this.utilService.getCurrentLocale());
    if (quantity === null && raw.trim().length > 0) return;

    const item = COUNT_ITEMS.find((entry) => entry.key === this.countItemKey);
    const grams =
      quantity === null || quantity <= 0 || !item
        ? null
        : quantity * item.gramsPerUnit;

    for (const weightUnit of WEIGHT_UNITS) {
      this.countWeightValues[weightUnit] =
        grams === null
          ? ""
          : formatDecimal(
              convertWeight(grams, "gram", weightUnit),
              this.utilService.getCurrentLocale(),
            );
    }
  }

  onTemperatureInput(field: "celsius" | "fahrenheit" | "gasMark") {
    const formatInt = (n: number) =>
      Math.round(n).toLocaleString(this.utilService.getCurrentLocale(), {
        useGrouping: false,
      });
    const formatGasMark = (fahrenheit: number) => {
      const mark = fahrenheitToGasMark(fahrenheit);
      return mark === null ? "" : formatInt(mark);
    };
    if (field === "celsius") {
      const celsius = parseQuantity(
        this.tempCelsius,
        this.utilService.getCurrentLocale(),
      );
      if (celsius === null) return;
      const fahrenheit = celsiusToFahrenheit(celsius);
      this.tempFahrenheit = formatInt(fahrenheit);
      this.tempGasMark = formatGasMark(fahrenheit);
    } else if (field === "fahrenheit") {
      const fahrenheit = parseQuantity(
        this.tempFahrenheit,
        this.utilService.getCurrentLocale(),
      );
      if (fahrenheit === null) return;
      this.tempCelsius = formatInt(fahrenheitToCelsius(fahrenheit));
      this.tempGasMark = formatGasMark(fahrenheit);
    } else {
      const mark = parseQuantity(
        this.tempGasMark,
        this.utilService.getCurrentLocale(),
      );
      if (mark === null) return;
      const fahrenheit = gasMarkToFahrenheit(mark);
      if (fahrenheit === null) {
        this.tempFahrenheit = "";
        this.tempCelsius = "";
        return;
      }
      this.tempFahrenheit = formatInt(fahrenheit);
      this.tempCelsius = formatInt(fahrenheitToCelsius(fahrenheit));
    }
  }
}
