import { Component, inject, ViewChild, type OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  ModalController,
  NavController,
  ToastController,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import {
  parseIngredients,
  parseQuantity,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
} from "@recipesage/util/shared";
import { addIcons } from "ionicons";
import {
  resizeOutline,
  swapHorizontalOutline,
  copyOutline,
  informationCircleOutline,
  chevronDownOutline,
  chevronUpOutline,
  flameOutline,
  checkmarkCircleOutline,
  arrowForwardOutline,
  ellipseOutline,
  squareOutline,
  tabletLandscapeOutline,
  fileTrayOutline,
  discOutline,
  albumsOutline,
  radioButtonOffOutline,
  gridOutline,
  searchOutline,
} from "ionicons/icons";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonChip,
} from "@ionic/angular/standalone";

import type { RecipeSummary } from "@recipesage/prisma";

import { RouteMap, UtilService } from "../../../services/util.service";
import { RecipeCompletionTrackerService } from "../../../services/recipe-completion-tracker.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { InfoBlockComponent } from "../../../components/info-block/info-block.component";
import { SelectRecipeModalComponent } from "../../../components/select-recipe-modal/select-recipe-modal.component";
import { TextInputComponent } from "../../../components/forms/text-input/text-input.component";
import { TextAreaComponent } from "../../../components/forms/text-area/text-area.component";
import {
  BATTER_TYPES,
  PAN_PRESETS_IMPERIAL,
  PAN_SHAPES,
  computeBakeTimeAdvice,
  computeScaling,
  cmToInches,
  cupsToMl,
  findSimilarPresets,
  formatCm,
  formatCups,
  formatInches,
  formatLiters,
  formatMl,
  formatMultiplier,
  inchesToCm,
  isFlatBottom,
  isNegligibleScaling,
  litersToMl,
  mlToCups,
  mlToLiters,
  panArea,
  panCapacityMl,
  presetToDimensions,
  presetsForUnit,
  sqCmToSqIn,
  type BakeTimeAdvice,
  type BakeTimeDirection,
  type BatterType,
  type PanDimensions,
  type PanPreset,
  type PanShape,
  type ScalingResult,
  type UnitSystem,
} from "./panBakewareData";

type PanSlot = "from" | "to";

interface PanState {
  shape: PanShape;
  selectedPresetKey: string | null;
  diameter: string;
  length: string;
  width: string;
  depth: string;
  cavities: string;
  cavityCapacity: string;
  capacityOverride: string;
}

interface ShapeOption {
  key: PanShape;
  iconName: string;
}

interface PresetOption {
  preset: PanPreset;
  label: string;
}

interface SubstitutionOption {
  preset: PanPreset;
  label: string;
  capacityLabel: string;
  deltaPct: number;
}

const DEFAULT_DEPTH_IN: Record<PanShape, number> = {
  round: 2,
  square: 2,
  rectangular: 2,
  loaf: 2.75,
  springform: 3,
  sheet: 1,
  bundtTube: 3.5,
  muffin: 1.25,
};

const DEFAULT_DEPTH_CM: Record<PanShape, number> = {
  round: 5,
  square: 5,
  rectangular: 5,
  loaf: 7,
  springform: 7,
  sheet: 2,
  bundtTube: 9,
  muffin: 3,
};

const SHAPE_LABEL_KEY: Record<PanShape, string> = {
  round: "pages.panBakewareConverter.shapes.round",
  square: "pages.panBakewareConverter.shapes.square",
  rectangular: "pages.panBakewareConverter.shapes.rectangular",
  loaf: "pages.panBakewareConverter.shapes.loaf",
  springform: "pages.panBakewareConverter.shapes.springform",
  sheet: "pages.panBakewareConverter.shapes.sheet",
  bundtTube: "pages.panBakewareConverter.shapes.bundtTube",
  muffin: "pages.panBakewareConverter.shapes.muffin",
};

const SHAPE_FORMAT_KEY: Record<PanShape, string> = {
  round: "pages.panBakewareConverter.presets.format.round",
  square: "pages.panBakewareConverter.presets.format.square",
  rectangular: "pages.panBakewareConverter.presets.format.rectangular",
  loaf: "pages.panBakewareConverter.presets.format.loaf",
  springform: "pages.panBakewareConverter.presets.format.springform",
  sheet: "pages.panBakewareConverter.presets.format.jellyRoll",
  bundtTube: "pages.panBakewareConverter.presets.format.bundt",
  muffin: "pages.panBakewareConverter.presets.format.muffin",
};

const PRESET_FORMAT_KEY_OVERRIDE: Record<string, string> = {
  pie9x1_5: "pages.panBakewareConverter.presets.format.pie",
  pie9x2DeepDish: "pages.panBakewareConverter.presets.format.pieDeepDish",
  loafMini: "pages.panBakewareConverter.presets.format.loafMini",
  quarterSheet: "pages.panBakewareConverter.presets.format.quarterSheet",
  halfSheet: "pages.panBakewareConverter.presets.format.halfSheet",
  fullSheet: "pages.panBakewareConverter.presets.format.fullSheet",
  bundt6cup: "pages.panBakewareConverter.presets.format.bundtMini",
  tube9: "pages.panBakewareConverter.presets.format.tube",
  tube10: "pages.panBakewareConverter.presets.format.tube",
  muffinMini24: "pages.panBakewareConverter.presets.format.muffinMini",
  muffinStandard6: "pages.panBakewareConverter.presets.format.muffinStandard",
  muffinStandard12: "pages.panBakewareConverter.presets.format.muffinStandard",
  muffinJumbo6: "pages.panBakewareConverter.presets.format.muffinJumbo",
  loafMmini: "pages.panBakewareConverter.presets.format.loafMini",
  swissRollM30x20: "pages.panBakewareConverter.presets.format.swissRoll",
  swissRollM33x23: "pages.panBakewareConverter.presets.format.swissRoll",
  bakingTrayM40x30: "pages.panBakewareConverter.presets.format.bakingTray",
  bundtM14: "pages.panBakewareConverter.presets.format.bundtMetric",
  bundtM21: "pages.panBakewareConverter.presets.format.bundtMetric",
  bundtM24: "pages.panBakewareConverter.presets.format.bundtMetric",
  bundtM28: "pages.panBakewareConverter.presets.format.bundtMetric",
  tubeM25: "pages.panBakewareConverter.presets.format.tube",
  muffinMmini24: "pages.panBakewareConverter.presets.format.muffinMini",
  muffinMstandard6: "pages.panBakewareConverter.presets.format.muffinStandard",
  muffinMstandard12: "pages.panBakewareConverter.presets.format.muffinStandard",
  muffinMjumbo6: "pages.panBakewareConverter.presets.format.muffinJumbo",
};

const BAKE_DIRECTION_LABEL_KEYS: Record<BakeTimeDirection, string> = {
  similar: "pages.panBakewareConverter.bake.direction.similar",
  shallower: "pages.panBakewareConverter.bake.direction.shallower",
  deeper: "pages.panBakewareConverter.bake.direction.deeper",
};

const BAKE_DETAIL_KEYS: Record<BakeTimeDirection, string> = {
  similar: "pages.panBakewareConverter.bake.guidance.similar",
  shallower: "pages.panBakewareConverter.bake.guidance.shallower",
  deeper: "pages.panBakewareConverter.bake.guidance.deeper",
};

const BATTER_TYPE_LABEL_KEY: Record<BatterType, string> = {
  cake: "pages.panBakewareConverter.batterType.cake",
  spongeFoam: "pages.panBakewareConverter.batterType.spongeFoam",
  quickBread: "pages.panBakewareConverter.batterType.quickBread",
  yeastBread: "pages.panBakewareConverter.batterType.yeastBread",
  cheesecake: "pages.panBakewareConverter.batterType.cheesecake",
  brownieBar: "pages.panBakewareConverter.batterType.brownieBar",
};

const DONENESS_KEY: Record<BatterType, string> = {
  cake: "pages.panBakewareConverter.doneness.cake",
  spongeFoam: "pages.panBakewareConverter.doneness.spongeFoam",
  quickBread: "pages.panBakewareConverter.doneness.quickBread",
  yeastBread: "pages.panBakewareConverter.doneness.yeastBread",
  cheesecake: "pages.panBakewareConverter.doneness.cheesecake",
  brownieBar: "pages.panBakewareConverter.doneness.brownieBar",
};

const SHAPE_OPTIONS: ShapeOption[] = [
  { key: "round", iconName: "ellipse-outline" },
  { key: "square", iconName: "square-outline" },
  { key: "rectangular", iconName: "tablet-landscape-outline" },
  { key: "loaf", iconName: "file-tray-outline" },
  { key: "springform", iconName: "disc-outline" },
  { key: "sheet", iconName: "albums-outline" },
  { key: "bundtTube", iconName: "radio-button-off-outline" },
  { key: "muffin", iconName: "grid-outline" },
];

@Component({
  standalone: true,
  selector: "page-pan-bakeware-converter",
  templateUrl: "pan-bakeware-converter.page.html",
  styleUrls: ["pan-bakeware-converter.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonChip,
    InfoBlockComponent,
    TextInputComponent,
    TextAreaComponent,
  ],
})
export class PanBakewareConverterPage implements OnInit {
  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
  private translate = inject(TranslateService);
  private toastCtrl = inject(ToastController);
  private utilService = inject(UtilService);
  private recipeCompletionTrackerService = inject(
    RecipeCompletionTrackerService,
  );

  @ViewChild(IonContent) content?: IonContent;

  defaultBackHref: string = RouteMap.ToolsPage.getPath();

  readonly shapeOptions = SHAPE_OPTIONS;
  readonly allShapes = PAN_SHAPES;
  readonly batterTypes = BATTER_TYPES;

  unit: UnitSystem = "imperial";
  batterType: BatterType = "cake";

  from: PanState = this.makeDefaultState("round", "round9x2");
  to: PanState = this.makeDefaultState("rectangular", "rect9x13");

  recipeText = "";
  recipeScaledLines: string[] = [];

  originalBakeTime = "";
  originalBakeTemp = "";
  suggestedBakeTimeLow = "";
  suggestedBakeTimeHigh = "";
  suggestedBakeTempF = "";
  suggestedBakeTempC = "";

  methodologyExpanded = false;
  referenceExpanded = false;

  constructor() {
    addIcons({
      resizeOutline,
      swapHorizontalOutline,
      copyOutline,
      informationCircleOutline,
      chevronDownOutline,
      chevronUpOutline,
      flameOutline,
      checkmarkCircleOutline,
      arrowForwardOutline,
      ellipseOutline,
      squareOutline,
      tabletLandscapeOutline,
      fileTrayOutline,
      discOutline,
      albumsOutline,
      radioButtonOffOutline,
      gridOutline,
      searchOutline,
    });
  }

  ngOnInit() {
    this.recomputeRecipeScale();
  }

  goToTools() {
    this.navCtrl.navigateForward(RouteMap.ToolsPage.getPath());
  }

  isLoggedIn(): boolean {
    return this.utilService.isLoggedIn();
  }

  private makeDefaultState(shape: PanShape, presetKey: string): PanState {
    const preset = PAN_PRESETS_IMPERIAL.find((p) => p.key === presetKey);
    return {
      shape,
      selectedPresetKey: preset?.key ?? null,
      diameter: this.formatDim(preset?.diameter),
      length: this.formatDim(preset?.length),
      width: this.formatDim(preset?.width),
      depth: this.formatDim(preset?.depth ?? this.defaultDepth(shape)),
      cavities: preset?.cavities !== undefined ? String(preset.cavities) : "",
      cavityCapacity:
        preset?.cavityCapacity !== undefined
          ? String(preset.cavityCapacity)
          : "",
      capacityOverride:
        preset?.capacityOverride !== undefined
          ? String(preset.capacityOverride)
          : "",
    };
  }

  private defaultDepth(shape: PanShape): number {
    return this.unit === "metric"
      ? DEFAULT_DEPTH_CM[shape]
      : DEFAULT_DEPTH_IN[shape];
  }

  private formatDim(value: number | undefined): string {
    if (value === undefined) return "";
    return this.unit === "metric" ? formatCm(value) : formatInches(value);
  }

  presetsForShape(shape: PanShape): PanPreset[] {
    return presetsForUnit(this.unit).filter((p) => p.shape === shape);
  }

  private slotState(slot: PanSlot): PanState {
    return slot === "from" ? this.from : this.to;
  }

  onShapeChange(slot: PanSlot, shape: PanShape) {
    const state = this.slotState(slot);
    state.shape = shape;
    state.selectedPresetKey = null;
    state.diameter = "";
    state.length = "";
    state.width = "";
    state.depth = this.formatDim(this.defaultDepth(shape));
    state.cavities = "";
    state.cavityCapacity = "";
    state.capacityOverride = "";
    const presets = this.presetsForShape(shape);
    if (presets.length > 0) {
      this.selectPreset(slot, presets[0].key);
    }
    this.recomputeAll();
  }

  selectPreset(slot: PanSlot, presetKey: string) {
    const preset = presetsForUnit(this.unit).find((p) => p.key === presetKey);
    if (!preset) return;
    const state = this.slotState(slot);
    state.shape = preset.shape;
    state.selectedPresetKey = preset.key;
    state.diameter = this.formatDim(preset.diameter);
    state.length = this.formatDim(preset.length);
    state.width = this.formatDim(preset.width);
    state.depth = this.formatDim(preset.depth);
    state.cavities =
      preset.cavities !== undefined ? String(preset.cavities) : "";
    state.cavityCapacity =
      preset.cavityCapacity !== undefined ? String(preset.cavityCapacity) : "";
    state.capacityOverride =
      preset.capacityOverride !== undefined
        ? String(preset.capacityOverride)
        : "";
    this.recomputeAll();
  }

  onDimensionInput(slot: PanSlot) {
    this.slotState(slot).selectedPresetKey = null;
    this.recomputeAll();
  }

  onShapeKey(event: KeyboardEvent, slot: PanSlot, shape: PanShape) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.onShapeChange(slot, shape);
    }
  }

  onPresetKey(event: KeyboardEvent, slot: PanSlot, presetKey: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.selectPreset(slot, presetKey);
    }
  }

  onUnitToggle(newUnit: string | number | undefined) {
    if (newUnit !== "imperial" && newUnit !== "metric") return;
    if (newUnit === this.unit) return;
    this.convertStateUnits(this.from, this.unit, newUnit);
    this.convertStateUnits(this.to, this.unit, newUnit);
    this.convertBakeTempUnits(this.unit, newUnit);
    this.from.selectedPresetKey = null;
    this.to.selectedPresetKey = null;
    this.unit = newUnit;
    this.recomputeRecipeScale();
    this.recomputeBakeAdvice();
  }

  private convertBakeTempUnits(fromUnit: UnitSystem, toUnit: UnitSystem) {
    if (fromUnit === toUnit) return;
    const v = parseQuantity(
      this.originalBakeTemp,
      this.translate.getCurrentLang(),
    );
    if (v === null) return;
    const newV =
      fromUnit === "metric" ? celsiusToFahrenheit(v) : fahrenheitToCelsius(v);
    this.originalBakeTemp = String(Math.round(newV));
  }

  private convertStateUnits(
    state: PanState,
    fromUnit: UnitSystem,
    toUnit: UnitSystem,
  ) {
    if (fromUnit === toUnit) return;
    const lang = this.translate.getCurrentLang();
    const linear = (raw: string): string => {
      const v = parseQuantity(raw, lang);
      if (v === null) return raw;
      const cm = fromUnit === "metric" ? v : inchesToCm(v);
      return toUnit === "metric" ? formatCm(cm) : formatInches(cmToInches(cm));
    };
    state.diameter = linear(state.diameter);
    state.length = linear(state.length);
    state.width = linear(state.width);
    state.depth = linear(state.depth);

    if (state.capacityOverride) {
      const v = parseQuantity(state.capacityOverride, lang);
      if (v !== null) {
        const ml = fromUnit === "metric" ? litersToMl(v) : cupsToMl(v);
        state.capacityOverride =
          toUnit === "metric"
            ? formatLiters(mlToLiters(ml))
            : formatCups(mlToCups(ml));
      }
    }

    if (state.cavityCapacity) {
      const v = parseQuantity(state.cavityCapacity, lang);
      if (v !== null) {
        const ml = fromUnit === "metric" ? v : cupsToMl(v);
        state.cavityCapacity =
          toUnit === "metric"
            ? String(Math.round(ml))
            : formatCups(mlToCups(ml));
      }
    }
  }

  swapPans() {
    const tmp = this.from;
    this.from = this.to;
    this.to = tmp;
    this.recomputeAll();
  }

  private dimensionsFor(slot: PanSlot): PanDimensions | null {
    const state = this.slotState(slot);
    const lang = this.translate.getCurrentLang();
    const cmFrom = (raw: string): number | null => {
      const v = parseQuantity(raw, lang);
      if (v === null || v <= 0) return null;
      return this.unit === "metric" ? v : inchesToCm(v);
    };

    const depthCm = cmFrom(state.depth);
    if (depthCm === null) return null;

    const base: PanDimensions = { shape: state.shape, depthCm };

    switch (state.shape) {
      case "round":
      case "springform": {
        const d = cmFrom(state.diameter);
        if (d === null) return null;
        return { ...base, diameterCm: d };
      }
      case "square": {
        const s = cmFrom(state.length);
        if (s === null) return null;
        return { ...base, lengthCm: s, widthCm: s };
      }
      case "rectangular":
      case "loaf":
      case "sheet": {
        const l = cmFrom(state.length);
        const w = cmFrom(state.width);
        if (l === null || w === null) return null;
        return { ...base, lengthCm: l, widthCm: w };
      }
      case "bundtTube": {
        const cap = parseQuantity(state.capacityOverride, lang);
        if (cap === null || cap <= 0) return null;
        const capacityMl =
          this.unit === "metric" ? litersToMl(cap) : cupsToMl(cap);
        return { ...base, capacityMlOverride: capacityMl };
      }
      case "muffin": {
        const cav = parseQuantity(state.cavities, lang);
        const cavCap = parseQuantity(state.cavityCapacity, lang);
        if (cav === null || cavCap === null || cav <= 0 || cavCap <= 0) {
          return null;
        }
        const cavityCapacityMl =
          this.unit === "metric" ? cavCap : cupsToMl(cavCap);
        return {
          ...base,
          cavities: Math.round(cav),
          cavityCapacityMl,
        };
      }
    }
  }

  get fromDimensions(): PanDimensions | null {
    return this.dimensionsFor("from");
  }

  get toDimensions(): PanDimensions | null {
    return this.dimensionsFor("to");
  }

  get scaling(): ScalingResult | null {
    const from = this.fromDimensions;
    const to = this.toDimensions;
    if (!from || !to) return null;
    return computeScaling(from, to);
  }

  canEstimateBakeTime(): boolean {
    return this.isFlatPan("from") && this.isFlatPan("to");
  }

  get bakeTimeAdvice(): BakeTimeAdvice | null {
    const from = this.fromDimensions;
    const to = this.toDimensions;
    const sc = this.scaling;
    if (!from || !to || !sc || !this.canEstimateBakeTime()) return null;
    return computeBakeTimeAdvice(from, to);
  }

  get substitutions(): SubstitutionOption[] {
    const from = this.fromDimensions;
    if (!from) return [];
    const targetCap = panCapacityMl(from);
    if (targetCap === null) return [];
    const matches = findSimilarPresets(
      from,
      [this.from.selectedPresetKey, this.to.selectedPresetKey],
      this.unit,
      0.1,
    );
    return matches.map((preset) => {
      const cap = panCapacityMl(presetToDimensions(preset)) ?? 0;
      const delta = ((cap - targetCap) / targetCap) * 100;
      return {
        preset,
        label: this.presetLabel(preset),
        capacityLabel: this.capacityCompactLabel(cap),
        deltaPct: delta,
      };
    });
  }

  presetLabel(preset: PanPreset): string {
    const key =
      PRESET_FORMAT_KEY_OVERRIDE[preset.key] ?? SHAPE_FORMAT_KEY[preset.shape];
    return this.translate.instant(key, this.presetFormatParams(preset));
  }

  private presetFormatParams(preset: PanPreset): Record<string, string> {
    const u = this.unitLabelShort();
    const fmt = (value: number | undefined): string =>
      value === undefined ? "" : this.formatDim(value);
    const isMetric = preset.unitSystem === "metric";
    return {
      u,
      d: fmt(preset.diameter),
      l: fmt(preset.length),
      w: fmt(preset.width),
      s: fmt(preset.length),
      h: fmt(preset.depth),
      c:
        !isMetric && preset.capacityOverride !== undefined
          ? String(preset.capacityOverride)
          : "",
      v:
        isMetric && preset.capacityOverride !== undefined
          ? String(preset.capacityOverride)
          : "",
      n: String(preset.cavities ?? ""),
    };
  }

  shapeLabel(shape: PanShape): string {
    return this.translate.instant(SHAPE_LABEL_KEY[shape]);
  }

  unitLabelShort(): string {
    return this.translate.instant(
      this.unit === "metric"
        ? "pages.panBakewareConverter.units.cm"
        : "pages.panBakewareConverter.units.in",
    );
  }

  unitLabelSquare(): string {
    return this.translate.instant(
      this.unit === "metric"
        ? "pages.panBakewareConverter.units.sqCm"
        : "pages.panBakewareConverter.units.sqIn",
    );
  }

  panAreaLabel(slot: PanSlot): string {
    const dims = this.dimensionsFor(slot);
    if (!dims) return "…";
    const area = panArea(dims);
    if (area === null) {
      return this.translate.instant(
        "pages.panBakewareConverter.area.notApplicable",
      );
    }
    return this.translate.instant("pages.panBakewareConverter.area.value", {
      area:
        this.unit === "metric" ? area.toFixed(0) : sqCmToSqIn(area).toFixed(1),
      unit: this.unitLabelSquare(),
    });
  }

  panCapacityLabel(slot: PanSlot): string {
    const dims = this.dimensionsFor(slot);
    if (!dims) return "…";
    return this.capacityLabelFor(dims);
  }

  capacityLabelFor(dims: PanDimensions): string {
    const ml = panCapacityMl(dims);
    if (ml === null) return "…";
    if (this.unit === "metric") return formatMl(ml);
    return this.translate.instant(
      "pages.panBakewareConverter.capacity.valueWithMl",
      {
        cups: formatCups(mlToCups(ml)),
        ml: formatMl(ml),
      },
    );
  }

  private capacityCompactLabel(ml: number): string {
    if (this.unit === "metric") return formatMl(ml);
    return this.translate.instant("pages.panBakewareConverter.capacity.value", {
      cups: formatCups(mlToCups(ml)),
    });
  }

  capacityUnitLabel(): string {
    return this.translate.instant(
      this.unit === "metric"
        ? "pages.panBakewareConverter.units.liters"
        : "pages.panBakewareConverter.units.cups",
    );
  }

  cavityUnitLabel(): string {
    return this.translate.instant(
      this.unit === "metric"
        ? "pages.panBakewareConverter.units.ml"
        : "pages.panBakewareConverter.units.cups",
    );
  }

  presetCapacityLabel(preset: PanPreset): string {
    return this.capacityLabelFor(presetToDimensions(preset));
  }

  multiplierLabel(): string {
    const sc = this.scaling;
    if (!sc) return "…";
    return formatMultiplier(sc.multiplier);
  }

  multiplierBasisLabel(): string {
    return this.translate.instant(
      "pages.panBakewareConverter.multiplier.basis",
    );
  }

  negligibleScaling(): boolean {
    const sc = this.scaling;
    return sc !== null && isNegligibleScaling(sc.multiplier);
  }

  noScaleExplanation(): string {
    const sc = this.scaling;
    if (!sc) return "";
    return this.translate.instant(
      "pages.panBakewareConverter.result.noScaleExplain",
      {
        multiplier: formatMultiplier(sc.multiplier),
      },
    );
  }

  async applyToRecipe() {
    const sc = this.scaling;
    if (!sc) return;

    const modal = await this.modalCtrl.create({
      component: SelectRecipeModalComponent,
    });
    await modal.present();

    const { data } = await modal.onDidDismiss<RecipeSummary>();
    if (!data) return;

    this.recipeCompletionTrackerService.setRecipeScale(
      data.id,
      formatMultiplier(sc.multiplier),
    );
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(data.id));
  }

  multiplierExplanation(): string {
    const sc = this.scaling;
    if (!sc) return "";
    if (this.unit === "metric") {
      return this.translate.instant(
        "pages.panBakewareConverter.multiplier.explainCapacityMetric",
        {
          toVolume: formatMl(sc.toCapacityMl),
          fromVolume: formatMl(sc.fromCapacityMl),
        },
      );
    }
    return this.translate.instant(
      "pages.panBakewareConverter.multiplier.explainCapacity",
      {
        toCups: formatCups(mlToCups(sc.toCapacityMl)),
        fromCups: formatCups(mlToCups(sc.fromCapacityMl)),
      },
    );
  }

  onRecipeTextInput() {
    this.recomputeRecipeScale();
  }

  private recomputeRecipeScale() {
    const sc = this.scaling;
    const text = this.recipeText.trim();
    if (!sc || !text) {
      this.recipeScaledLines = [];
      return;
    }
    const scaleStr = formatMultiplier(sc.multiplier);
    const parsed = parseIngredients(text, scaleStr);
    this.recipeScaledLines = parsed.map((line) => line.plaintextContent);
  }

  onBakeInput() {
    this.recomputeBakeAdvice();
  }

  private recomputeBakeAdvice() {
    const advice = this.bakeTimeAdvice;
    if (!advice) {
      this.suggestedBakeTimeLow = "";
      this.suggestedBakeTimeHigh = "";
      this.suggestedBakeTempF = "";
      this.suggestedBakeTempC = "";
      return;
    }
    const time = parseQuantity(
      this.originalBakeTime,
      this.translate.getCurrentLang(),
    );
    if (time !== null && time > 0) {
      const low = Math.max(1, Math.round(time * advice.timeMultiplierLow));
      const high = Math.max(low, Math.round(time * advice.timeMultiplierHigh));
      this.suggestedBakeTimeLow = String(low);
      this.suggestedBakeTimeHigh = String(high);
    } else {
      this.suggestedBakeTimeLow = "";
      this.suggestedBakeTimeHigh = "";
    }
    const tempIn = parseQuantity(
      this.originalBakeTemp,
      this.translate.getCurrentLang(),
    );
    if (tempIn !== null && tempIn > 0) {
      if (this.unit === "metric") {
        const newC = tempIn + advice.suggestedTempDeltaC;
        this.suggestedBakeTempC = String(Math.round(newC));
        this.suggestedBakeTempF = String(Math.round(celsiusToFahrenheit(newC)));
      } else {
        const newF = tempIn + advice.suggestedTempDeltaF;
        this.suggestedBakeTempF = String(Math.round(newF));
        this.suggestedBakeTempC = String(Math.round(fahrenheitToCelsius(newF)));
      }
    } else {
      this.suggestedBakeTempF = "";
      this.suggestedBakeTempC = "";
    }
  }

  bakeTempInputLabel(): string {
    return this.translate.instant(
      this.unit === "metric"
        ? "pages.panBakewareConverter.bake.originalTempC"
        : "pages.panBakewareConverter.bake.originalTempF",
    );
  }

  bakeTempInputPlaceholder(): string {
    return this.translate.instant(
      this.unit === "metric"
        ? "pages.panBakewareConverter.bake.originalTempPlaceholderC"
        : "pages.panBakewareConverter.bake.originalTempPlaceholderF",
    );
  }

  bakeTempChanges(): boolean {
    const advice = this.bakeTimeAdvice;
    return advice !== null && advice.suggestedTempDeltaF !== 0;
  }

  bakeDirectionLabel(): string {
    const advice = this.bakeTimeAdvice;
    if (!advice) return "";
    return this.translate.instant(BAKE_DIRECTION_LABEL_KEYS[advice.direction]);
  }

  bakeDirectionDetail(): string {
    const advice = this.bakeTimeAdvice;
    if (!advice) return "";
    return this.translate.instant(BAKE_DETAIL_KEYS[advice.direction]);
  }

  donenessDetail(): string {
    return this.translate.instant(DONENESS_KEY[this.batterType]);
  }

  batterTypeLabel(type: BatterType): string {
    return this.translate.instant(BATTER_TYPE_LABEL_KEY[type]);
  }

  onBatterTypeChange(type: BatterType) {
    this.batterType = type;
  }

  onBatterTypeKey(event: KeyboardEvent, type: BatterType) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.onBatterTypeChange(type);
    }
  }

  bakeDirectionColor(): string {
    const advice = this.bakeTimeAdvice;
    if (!advice) return "medium";
    if (advice.direction === "similar") return "success";
    if (advice.suggestedTempDeltaF !== 0) return "warning";
    return "primary";
  }

  applySubstitution(option: SubstitutionOption) {
    this.selectPreset("to", option.preset.key);
    this.content?.scrollToTop(300);
  }

  async copyMultiplier() {
    const sc = this.scaling;
    if (!sc) return;
    try {
      await navigator.clipboard.writeText(formatMultiplier(sc.multiplier));
      const toast = await this.toastCtrl.create({
        message: this.translate.instant(
          "pages.panBakewareConverter.multiplier.copied",
        ),
        duration: 1500,
        position: "bottom",
      });
      await toast.present();
    } catch {
      return;
    }
  }

  isFlatPan(slot: PanSlot): boolean {
    const dims = this.dimensionsFor(slot);
    return dims !== null && isFlatBottom(dims.shape);
  }

  private recomputeAll() {
    this.recomputeRecipeScale();
    this.recomputeBakeAdvice();
  }
}
