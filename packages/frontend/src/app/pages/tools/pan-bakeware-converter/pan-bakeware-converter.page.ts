import { Component, inject, type OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NavController, ToastController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import {
  parseIngredients,
  parseQuantity,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
} from "@recipesage/util/shared";
import { addIcons } from "ionicons";
import {
  resize,
  swapHorizontal,
  copyOutline,
  informationCircle,
  warning,
  chevronDown,
  chevronUp,
  flame,
  checkmarkCircle,
  arrowForward,
  ellipseOutline,
  squareOutline,
  tabletLandscapeOutline,
  fileTrayOutline,
  discOutline,
  albumsOutline,
  radioButtonOffOutline,
  gridOutline,
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
  IonInput,
  IonButton,
  IonIcon,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonChip,
  IonTextarea,
} from "@ionic/angular/standalone";

import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  PAN_PRESETS,
  PAN_SHAPES,
  PRESETS_BY_SHAPE,
  computeBakeTimeAdvice,
  computeCapacityWarning,
  computeDepthAdvisory,
  computeScaling,
  cmToInches,
  cupsToMl,
  findSimilarPresets,
  formatCups,
  formatInches,
  formatMl,
  formatMultiplier,
  inchesToCm,
  isFlatBottom,
  panArea,
  panCapacityCups,
  sqInToSqCm,
  type BakeTimeAdvice,
  type CapacityWarning,
  type DepthAdvisory,
  type PanDimensions,
  type PanPreset,
  type PanShape,
  type ScalingResult,
} from "./panBakewareData";

type UnitSystem = "imperial" | "metric";
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

const DEFAULT_DEPTH_BY_SHAPE: Record<PanShape, number> = {
  round: 2,
  square: 2,
  rectangular: 2,
  loaf: 2.75,
  springform: 3,
  sheet: 1,
  bundtTube: 3.5,
  muffin: 1.25,
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
    IonInput,
    IonButton,
    IonIcon,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonTextarea,
  ],
})
export class PanBakewareConverterPage implements OnInit {
  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private toastCtrl = inject(ToastController);

  defaultBackHref: string = RouteMap.ToolsPage.getPath();

  readonly shapeOptions = SHAPE_OPTIONS;
  readonly allShapes = PAN_SHAPES;
  readonly presetsByShape = PRESETS_BY_SHAPE;

  unit: UnitSystem = "imperial";

  from: PanState = this.makeDefaultState("round", "round9x2");
  to: PanState = this.makeDefaultState("rectangular", "rect9x13");

  recipeText = "";
  recipeScaledLines: string[] = [];

  originalBakeTime = "";
  originalBakeTemp = "";
  suggestedBakeTime = "";
  suggestedBakeTempF = "";
  suggestedBakeTempC = "";

  methodologyExpanded = false;
  referenceExpanded = false;

  constructor() {
    addIcons({
      resize,
      swapHorizontal,
      copyOutline,
      informationCircle,
      warning,
      chevronDown,
      chevronUp,
      flame,
      checkmarkCircle,
      arrowForward,
      ellipseOutline,
      squareOutline,
      tabletLandscapeOutline,
      fileTrayOutline,
      discOutline,
      albumsOutline,
      radioButtonOffOutline,
      gridOutline,
    });
  }

  ngOnInit() {
    this.recomputeRecipeScale();
  }

  goToTools() {
    this.navCtrl.navigateForward(RouteMap.ToolsPage.getPath());
  }

  private makeDefaultState(shape: PanShape, presetKey: string): PanState {
    const preset = PAN_PRESETS.find((p) => p.key === presetKey);
    return {
      shape,
      selectedPresetKey: preset?.key ?? null,
      diameter: this.formatDimInput(preset?.diameterIn),
      length: this.formatDimInput(preset?.lengthIn),
      width: this.formatDimInput(preset?.widthIn),
      depth: this.formatDimInput(
        preset?.depthIn ?? DEFAULT_DEPTH_BY_SHAPE[shape],
      ),
      cavities: preset?.cavities !== undefined ? String(preset.cavities) : "",
      cavityCapacity:
        preset?.cavityCapacityCups !== undefined
          ? String(preset.cavityCapacityCups)
          : "",
      capacityOverride:
        preset?.capacityCupsOverride !== undefined
          ? String(preset.capacityCupsOverride)
          : "",
    };
  }

  private formatDimInput(inches: number | undefined): string {
    if (inches === undefined) return "";
    if (this.unit === "metric") return inchesToCm(inches).toFixed(1);
    return formatInches(inches);
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
    state.depth = this.formatDimInput(DEFAULT_DEPTH_BY_SHAPE[shape]);
    state.cavities = "";
    state.cavityCapacity = "";
    state.capacityOverride = "";
    const presets = PRESETS_BY_SHAPE[shape];
    if (presets.length > 0) {
      this.selectPreset(slot, presets[0].key);
    }
    this.recomputeAll();
  }

  selectPreset(slot: PanSlot, presetKey: string) {
    const preset = PAN_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;
    const state = this.slotState(slot);
    state.shape = preset.shape;
    state.selectedPresetKey = preset.key;
    state.diameter = this.formatDimInput(preset.diameterIn);
    state.length = this.formatDimInput(preset.lengthIn);
    state.width = this.formatDimInput(preset.widthIn);
    state.depth = this.formatDimInput(preset.depthIn);
    state.cavities =
      preset.cavities !== undefined ? String(preset.cavities) : "";
    state.cavityCapacity =
      preset.cavityCapacityCups !== undefined
        ? String(preset.cavityCapacityCups)
        : "";
    state.capacityOverride =
      preset.capacityCupsOverride !== undefined
        ? String(preset.capacityCupsOverride)
        : "";
    this.recomputeAll();
  }

  onDimensionInput(slot: PanSlot) {
    this.slotState(slot).selectedPresetKey = null;
    this.recomputeAll();
  }

  onUnitToggle(newUnit: string | number | undefined) {
    if (newUnit !== "imperial" && newUnit !== "metric") return;
    if (newUnit === this.unit) return;
    this.convertStateUnits(this.from, this.unit, newUnit);
    this.convertStateUnits(this.to, this.unit, newUnit);
    this.convertBakeTempUnits(this.unit, newUnit);
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
    const convert = (raw: string): string => {
      const v = parseQuantity(raw, this.translate.getCurrentLang());
      if (v === null) return raw;
      const inches = fromUnit === "metric" ? cmToInches(v) : v;
      return toUnit === "metric"
        ? inchesToCm(inches).toFixed(1)
        : formatInches(inches);
    };
    state.diameter = convert(state.diameter);
    state.length = convert(state.length);
    state.width = convert(state.width);
    state.depth = convert(state.depth);
  }

  swapPans() {
    const tmp = this.from;
    this.from = this.to;
    this.to = tmp;
    this.recomputeAll();
  }

  private dimensionsFor(slot: PanSlot): PanDimensions | null {
    const state = this.slotState(slot);
    const inchesFrom = (raw: string): number | null => {
      const v = parseQuantity(raw, this.translate.getCurrentLang());
      if (v === null || v <= 0) return null;
      return this.unit === "metric" ? cmToInches(v) : v;
    };

    const depthIn = inchesFrom(state.depth);
    if (depthIn === null) return null;

    const base: PanDimensions = { shape: state.shape, depthIn };

    switch (state.shape) {
      case "round":
      case "springform": {
        const d = inchesFrom(state.diameter);
        if (d === null) return null;
        return { ...base, diameterIn: d };
      }
      case "square": {
        const s = inchesFrom(state.length);
        if (s === null) return null;
        return { ...base, lengthIn: s, widthIn: s };
      }
      case "rectangular":
      case "loaf":
      case "sheet": {
        const l = inchesFrom(state.length);
        const w = inchesFrom(state.width);
        if (l === null || w === null) return null;
        return { ...base, lengthIn: l, widthIn: w };
      }
      case "bundtTube": {
        const cap = parseQuantity(
          state.capacityOverride,
          this.translate.getCurrentLang(),
        );
        if (cap === null || cap <= 0) return null;
        return { ...base, capacityCupsOverride: cap };
      }
      case "muffin": {
        const cav = parseQuantity(
          state.cavities,
          this.translate.getCurrentLang(),
        );
        const cavCap = parseQuantity(
          state.cavityCapacity,
          this.translate.getCurrentLang(),
        );
        if (cav === null || cavCap === null || cav <= 0 || cavCap <= 0) {
          return null;
        }
        return {
          ...base,
          cavities: Math.round(cav),
          cavityCapacityCups: cavCap,
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

  get depthAdvisory(): DepthAdvisory | null {
    const from = this.fromDimensions;
    const to = this.toDimensions;
    const sc = this.scaling;
    if (!from || !to || !sc) return null;
    return computeDepthAdvisory(from, to, sc.multiplier, null);
  }

  get capacityWarning(): CapacityWarning | null {
    const to = this.toDimensions;
    const from = this.fromDimensions;
    const sc = this.scaling;
    if (!from || !to || !sc) return null;
    const fromCap = panCapacityCups(from);
    if (fromCap === null) return null;
    const fromUsable = fromCap * (2 / 3);
    const scaledBatter = fromUsable * sc.multiplier;
    return computeCapacityWarning(to, scaledBatter);
  }

  get bakeTimeAdvice(): BakeTimeAdvice | null {
    const from = this.fromDimensions;
    const to = this.toDimensions;
    const sc = this.scaling;
    if (!from || !to || !sc) return null;
    return computeBakeTimeAdvice(from, to, sc.multiplier);
  }

  get substitutions(): SubstitutionOption[] {
    const from = this.fromDimensions;
    if (!from) return [];
    const targetCap = panCapacityCups(from);
    if (targetCap === null) return [];
    const matches = findSimilarPresets(from, this.from.selectedPresetKey, 0.1);
    return matches.map((preset) => {
      const cap = panCapacityCups(preset) ?? 0;
      const delta = ((cap - targetCap) / targetCap) * 100;
      return {
        preset,
        label: this.presetLabel(preset),
        capacityLabel: this.translate.instant(
          "pages.panBakewareConverter.capacity.value",
          { cups: formatCups(cap) },
        ),
        deltaPct: delta,
      };
    });
  }

  presetLabel(preset: PanPreset): string {
    return this.translate.instant(
      `pages.panBakewareConverter.presets.${preset.key}`,
    );
  }

  shapeLabel(shape: PanShape): string {
    return this.translate.instant(`pages.panBakewareConverter.shapes.${shape}`);
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
        this.unit === "metric" ? sqInToSqCm(area).toFixed(0) : area.toFixed(1),
      unit: this.unitLabelSquare(),
    });
  }

  panCapacityLabel(slot: PanSlot): string {
    const dims = this.dimensionsFor(slot);
    if (!dims) return "…";
    return this.capacityLabelFor(dims);
  }

  capacityLabelFor(dims: PanDimensions): string {
    const cups = panCapacityCups(dims);
    if (cups === null) return "…";
    return this.translate.instant(
      "pages.panBakewareConverter.capacity.valueWithMl",
      {
        cups: formatCups(cups),
        ml: formatMl(cupsToMl(cups)),
      },
    );
  }

  presetCapacityLabel(preset: PanPreset): string {
    return this.capacityLabelFor(preset);
  }

  multiplierLabel(): string {
    const sc = this.scaling;
    if (!sc) return "…";
    return formatMultiplier(sc.multiplier);
  }

  multiplierBasisLabel(): string {
    const sc = this.scaling;
    if (!sc) return "";
    return this.translate.instant(
      sc.basis === "area"
        ? "pages.panBakewareConverter.multiplier.basisArea"
        : "pages.panBakewareConverter.multiplier.basisCapacity",
    );
  }

  multiplierExplanation(): string {
    const sc = this.scaling;
    if (!sc) return "";
    const fromArea = sc.fromArea;
    const toArea = sc.toArea;
    const fromCap = sc.fromCapacityCups;
    const toCap = sc.toCapacityCups;
    if (sc.basis === "area" && fromArea !== null && toArea !== null) {
      return this.translate.instant(
        "pages.panBakewareConverter.multiplier.explainArea",
        {
          toArea:
            this.unit === "metric"
              ? sqInToSqCm(toArea).toFixed(0)
              : toArea.toFixed(1),
          fromArea:
            this.unit === "metric"
              ? sqInToSqCm(fromArea).toFixed(0)
              : fromArea.toFixed(1),
          unit: this.unitLabelSquare(),
        },
      );
    }
    if (fromCap !== null && toCap !== null) {
      return this.translate.instant(
        "pages.panBakewareConverter.multiplier.explainCapacity",
        {
          toCups: formatCups(toCap),
          fromCups: formatCups(fromCap),
        },
      );
    }
    return "";
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
    const scaleStr = String(sc.multiplier);
    const parsed = parseIngredients(text, scaleStr);
    this.recipeScaledLines = parsed.map((line) => line.plaintextContent);
  }

  onBakeInput() {
    this.recomputeBakeAdvice();
  }

  private recomputeBakeAdvice() {
    const advice = this.bakeTimeAdvice;
    if (!advice) {
      this.suggestedBakeTime = "";
      this.suggestedBakeTempF = "";
      this.suggestedBakeTempC = "";
      return;
    }
    const time = parseQuantity(
      this.originalBakeTime,
      this.translate.getCurrentLang(),
    );
    if (time !== null && time > 0) {
      this.suggestedBakeTime = String(
        Math.round(time * advice.estimatedTimeMultiplier),
      );
    } else {
      this.suggestedBakeTime = "";
    }
    const tempIn = parseQuantity(
      this.originalBakeTemp,
      this.translate.getCurrentLang(),
    );
    if (tempIn !== null && tempIn > 0) {
      const inputF =
        this.unit === "metric" ? celsiusToFahrenheit(tempIn) : tempIn;
      const newF = inputF + advice.suggestedTempDeltaF;
      this.suggestedBakeTempF = String(Math.round(newF));
      this.suggestedBakeTempC = String(Math.round(fahrenheitToCelsius(newF)));
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

  bakeTempResultLabel(): string {
    if (!this.suggestedBakeTempF) return "…";
    return this.translate.instant(
      this.unit === "metric"
        ? "pages.panBakewareConverter.bake.tempResultMetric"
        : "pages.panBakewareConverter.bake.tempResultImperial",
      { f: this.suggestedBakeTempF, c: this.suggestedBakeTempC },
    );
  }

  bakeDirectionLabel(): string {
    const advice = this.bakeTimeAdvice;
    if (!advice) return "";
    return this.translate.instant(
      `pages.panBakewareConverter.bake.direction.${advice.direction}`,
    );
  }

  bakeDirectionDetail(): string {
    const advice = this.bakeTimeAdvice;
    if (!advice) return "";
    return this.translate.instant(
      `pages.panBakewareConverter.bake.detail.${advice.direction}`,
    );
  }

  bakeDirectionColor(): string {
    const advice = this.bakeTimeAdvice;
    if (!advice) return "medium";
    if (advice.direction === "shallower") return "warning";
    if (advice.direction === "deeper") return "warning";
    return "success";
  }

  applySubstitution(option: SubstitutionOption) {
    this.selectPreset("to", option.preset.key);
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

  fromVizPx(): { width: number; height: number; isRound: boolean } | null {
    return this.vizPx("from");
  }

  toVizPx(): { width: number; height: number; isRound: boolean } | null {
    return this.vizPx("to");
  }

  private vizPx(
    slot: PanSlot,
  ): { width: number; height: number; isRound: boolean } | null {
    const dims = this.dimensionsFor(slot);
    if (!dims) return null;
    const fromDims = this.fromDimensions;
    const toDims = this.toDimensions;
    if (!fromDims || !toDims) return null;
    const longestSide = (d: PanDimensions): number => {
      if (d.shape === "round" || d.shape === "springform") {
        return d.diameterIn ?? 0;
      }
      return Math.max(d.lengthIn ?? 0, d.widthIn ?? 0);
    };
    const maxSide = Math.max(longestSide(fromDims), longestSide(toDims), 1);
    const MAX_PX = 120;
    const scale = MAX_PX / maxSide;

    const isRound = dims.shape === "round" || dims.shape === "springform";
    if (isRound) {
      const d = (dims.diameterIn ?? 0) * scale;
      return { width: d, height: d, isRound: true };
    }
    if (dims.shape === "square") {
      const s = (dims.lengthIn ?? 0) * scale;
      return { width: s, height: s, isRound: false };
    }
    if (
      dims.shape === "rectangular" ||
      dims.shape === "loaf" ||
      dims.shape === "sheet"
    ) {
      return {
        width: (dims.lengthIn ?? 0) * scale,
        height: (dims.widthIn ?? 0) * scale,
        isRound: false,
      };
    }
    return null;
  }

  depthBarPercent(depthIn: number, panDepthIn: number): number {
    if (panDepthIn <= 0) return 0;
    const pct = (depthIn / panDepthIn) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  panDepthIn(slot: PanSlot): number {
    return this.dimensionsFor(slot)?.depthIn ?? 0;
  }

  depthAdvisoryFromBatter(): number {
    const adv = this.depthAdvisory;
    if (!adv || adv.fromBatterDepthIn === null) return 0;
    return adv.fromBatterDepthIn;
  }

  depthAdvisoryToBatter(): number {
    const adv = this.depthAdvisory;
    if (!adv || adv.newBatterDepthIn === null) return 0;
    return adv.newBatterDepthIn;
  }

  showDepthComparator(): boolean {
    return this.isFlatPan("from") && this.isFlatPan("to");
  }

  depthRowValue(slot: PanSlot): string {
    const dims = this.dimensionsFor(slot);
    if (!dims) return "";
    const batterIn =
      slot === "from"
        ? this.depthAdvisoryFromBatter()
        : this.depthAdvisoryToBatter();
    const toDisplay = (inches: number): string =>
      this.unit === "metric"
        ? inchesToCm(inches).toFixed(1)
        : inches.toFixed(2);
    return this.translate.instant("pages.panBakewareConverter.depth.value", {
      batter: toDisplay(batterIn),
      pan: toDisplay(dims.depthIn),
      unit: this.unitLabelShort(),
    });
  }

  private recomputeAll() {
    this.recomputeRecipeScale();
    this.recomputeBakeAdvice();
  }
}
