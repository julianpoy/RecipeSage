import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { Clipboard } from "@capacitor/clipboard";
import {
  ArrowLeftRightIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  CopyIcon,
  FlameIcon,
  InfoIcon,
  Maximize2Icon,
  SearchIcon,
} from "lucide-react";
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  inferIngredientsNotation,
  parseIngredients,
  parseQuantity,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { showToast } from "../../../components/dialogs/showToast";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { InfoBlock } from "../../../components/info-block/InfoBlock";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { openSelectRecipeModal } from "../../../components/select-recipe-modal/openSelectRecipeModal";
import { useIsLoggedIn } from "../../../hooks/useIsLoggedIn";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import { recipeCompletionTrackerService } from "../../../services/recipeCompletionTrackerService";
import { getCurrentLocale } from "../../../utils/formatDate";
import { createHistoryEntrySnapshotStore } from "../createHistoryEntrySnapshotStore";
import {
  PanCard,
  SHAPE_LABEL_KEYS,
  type PanField,
  type PanState,
} from "./PanCard";
import {
  panBakewareData,
  type BakeTimeDirection,
  type BatterType,
  type PanDimensions,
  type PanPreset,
  type PanShape,
  type UnitSystem,
} from "./panBakewareData";
import { ToggleChip } from "./ToggleChip";

type PanSlot = "from" | "to";

interface ConverterState {
  from: PanState;
  to: PanState;
  originalBakeTemp: string;
}

interface UnitToggleSnapshot {
  unit: UnitSystem;
  stateAfterToggle: ConverterState;
  previousUnit: UnitSystem;
  stateBeforeToggle: ConverterState;
}

interface SubstitutionOption {
  preset: PanPreset;
  label: string;
  capacityLabel: string;
  deltaPct: number;
}

interface PanConverterState {
  unit: UnitSystem;
  unitToggleSnapshot: UnitToggleSnapshot | null;
  batterType: BatterType;
  from: PanState;
  to: PanState;
  recipeText: string;
  originalBakeTime: string;
  originalBakeTemp: string;
  methodologyExpanded: boolean;
  referenceExpanded: boolean;
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

const SHAPE_FORMAT_KEY: Record<PanShape, TranslationKey> = {
  round: "pages.panBakewareConverter.presets.format.round",
  square: "pages.panBakewareConverter.presets.format.square",
  rectangular: "pages.panBakewareConverter.presets.format.rectangular",
  loaf: "pages.panBakewareConverter.presets.format.loaf",
  springform: "pages.panBakewareConverter.presets.format.springform",
  sheet: "pages.panBakewareConverter.presets.format.jellyRoll",
  bundtTube: "pages.panBakewareConverter.presets.format.bundt",
  muffin: "pages.panBakewareConverter.presets.format.muffin",
};

const PRESET_FORMAT_KEY_OVERRIDE: Partial<Record<string, TranslationKey>> = {
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

const BAKE_DIRECTION_LABEL_KEYS: Record<BakeTimeDirection, TranslationKey> = {
  similar: "pages.panBakewareConverter.bake.direction.similar",
  shallower: "pages.panBakewareConverter.bake.direction.shallower",
  deeper: "pages.panBakewareConverter.bake.direction.deeper",
};

const BAKE_DETAIL_KEYS: Record<BakeTimeDirection, TranslationKey> = {
  similar: "pages.panBakewareConverter.bake.guidance.similar",
  shallower: "pages.panBakewareConverter.bake.guidance.shallower",
  deeper: "pages.panBakewareConverter.bake.guidance.deeper",
};

const BATTER_TYPE_LABEL_KEY: Record<BatterType, TranslationKey> = {
  cake: "pages.panBakewareConverter.batterType.cake",
  spongeFoam: "pages.panBakewareConverter.batterType.spongeFoam",
  quickBread: "pages.panBakewareConverter.batterType.quickBread",
  yeastBread: "pages.panBakewareConverter.batterType.yeastBread",
  cheesecake: "pages.panBakewareConverter.batterType.cheesecake",
  brownieBar: "pages.panBakewareConverter.batterType.brownieBar",
};

const DONENESS_KEY: Record<BatterType, TranslationKey> = {
  cake: "pages.panBakewareConverter.doneness.cake",
  spongeFoam: "pages.panBakewareConverter.doneness.spongeFoam",
  quickBread: "pages.panBakewareConverter.doneness.quickBread",
  yeastBread: "pages.panBakewareConverter.doneness.yeastBread",
  cheesecake: "pages.panBakewareConverter.doneness.cheesecake",
  brownieBar: "pages.panBakewareConverter.doneness.brownieBar",
};

const BAKE_DIRECTION_CHIP_CLASSES: Record<
  "success" | "warning" | "primary" | "medium",
  string
> = {
  success: "border-green-600/50 bg-green-600/20",
  warning: "border-amber-500/50 bg-amber-500/20",
  primary: "border-primary/50 bg-primary/20",
  medium: "border-border bg-muted",
};

const formatDim = (value: number | undefined): string => {
  if (value === undefined) return "";
  return value.toLocaleString(getCurrentLocale(), {
    maximumFractionDigits: 3,
    useGrouping: false,
  });
};

const defaultDepth = (shape: PanShape, unit: UnitSystem): number =>
  unit === "metric" ? DEFAULT_DEPTH_CM[shape] : DEFAULT_DEPTH_IN[shape];

const presetsForShape = (shape: PanShape, unit: UnitSystem): PanPreset[] =>
  panBakewareData.presetsForUnit(unit).filter((p) => p.shape === shape);

const makeDefaultState = (shape: PanShape, presetKey: string): PanState => {
  const preset = panBakewareData.PAN_PRESETS_IMPERIAL.find(
    (p) => p.key === presetKey,
  );
  return {
    shape,
    selectedPresetKey: preset?.key ?? null,
    diameter: formatDim(preset?.diameter),
    length: formatDim(preset?.length),
    width: formatDim(preset?.width),
    depth: formatDim(preset?.depth ?? defaultDepth(shape, "imperial")),
    cavities: formatDim(preset?.cavities),
    cavityCapacity: formatDim(preset?.cavityCapacity),
    capacityOverride: formatDim(preset?.capacityOverride),
  };
};

const applyPreset = (
  state: PanState,
  presetKey: string,
  unit: UnitSystem,
): PanState => {
  const preset = panBakewareData
    .presetsForUnit(unit)
    .find((p) => p.key === presetKey);
  if (!preset) return state;
  return {
    shape: preset.shape,
    selectedPresetKey: preset.key,
    diameter: formatDim(preset.diameter),
    length: formatDim(preset.length),
    width: formatDim(preset.width),
    depth: formatDim(preset.depth),
    cavities: formatDim(preset.cavities),
    cavityCapacity: formatDim(preset.cavityCapacity),
    capacityOverride: formatDim(preset.capacityOverride),
  };
};

const applyShapeChange = (shape: PanShape, unit: UnitSystem): PanState => {
  const reset: PanState = {
    shape,
    selectedPresetKey: null,
    diameter: "",
    length: "",
    width: "",
    depth: formatDim(defaultDepth(shape, unit)),
    cavities: "",
    cavityCapacity: "",
    capacityOverride: "",
  };
  const presets = presetsForShape(shape, unit);
  if (presets.length > 0) {
    return applyPreset(reset, presets[0].key, unit);
  }
  return reset;
};

const convertBakeTempUnits = (
  originalBakeTemp: string,
  fromUnit: UnitSystem,
  toUnit: UnitSystem,
): string => {
  if (fromUnit === toUnit) return originalBakeTemp;
  const v = parseQuantity(originalBakeTemp, getCurrentLocale());
  if (v === null) return originalBakeTemp;
  const newV =
    fromUnit === "metric" ? celsiusToFahrenheit(v) : fahrenheitToCelsius(v);
  return String(Math.round(newV));
};

const convertStateUnits = (
  state: PanState,
  fromUnit: UnitSystem,
  toUnit: UnitSystem,
): PanState => {
  if (fromUnit === toUnit) return state;
  const lang = getCurrentLocale();
  const linear = (raw: string): string => {
    const v = parseQuantity(raw, lang);
    if (v === null) return raw;
    const cm = fromUnit === "metric" ? v : panBakewareData.inchesToCm(v);
    return toUnit === "metric"
      ? panBakewareData.formatCm(cm)
      : panBakewareData.formatInches(panBakewareData.cmToInches(cm));
  };

  const next: PanState = {
    ...state,
    diameter: linear(state.diameter),
    length: linear(state.length),
    width: linear(state.width),
    depth: linear(state.depth),
  };

  if (state.capacityOverride) {
    const v = parseQuantity(state.capacityOverride, lang);
    if (v !== null) {
      const ml =
        fromUnit === "metric"
          ? panBakewareData.litersToMl(v)
          : panBakewareData.cupsToMl(v);
      next.capacityOverride =
        toUnit === "metric"
          ? panBakewareData.formatLiters(panBakewareData.mlToLiters(ml))
          : panBakewareData.formatCups(panBakewareData.mlToCups(ml));
    }
  }

  if (state.cavityCapacity) {
    const v = parseQuantity(state.cavityCapacity, lang);
    if (v !== null) {
      const ml = fromUnit === "metric" ? v : panBakewareData.cupsToMl(v);
      next.cavityCapacity =
        toUnit === "metric"
          ? String(Math.round(ml))
          : panBakewareData.formatCups(panBakewareData.mlToCups(ml));
    }
  }

  return next;
};

const panStateEquals = (a: PanState, b: PanState): boolean =>
  a.shape === b.shape &&
  a.selectedPresetKey === b.selectedPresetKey &&
  a.diameter === b.diameter &&
  a.length === b.length &&
  a.width === b.width &&
  a.depth === b.depth &&
  a.cavities === b.cavities &&
  a.cavityCapacity === b.cavityCapacity &&
  a.capacityOverride === b.capacityOverride;

const restorePanState = (
  current: PanState,
  producedByLastToggle: PanState,
  beforeLastToggle: PanState,
  fromUnit: UnitSystem,
  toUnit: UnitSystem,
): PanState => {
  if (panStateEquals(current, producedByLastToggle)) {
    return { ...beforeLastToggle };
  }

  return {
    ...convertStateUnits(current, fromUnit, toUnit),
    selectedPresetKey: null,
  };
};

const toggleUnit = (
  state: PanConverterState,
  newUnit: UnitSystem,
): PanConverterState => {
  if (newUnit === state.unit) return state;

  const previousUnit = state.unit;
  const stateBeforeToggle: ConverterState = {
    from: { ...state.from },
    to: { ...state.to },
    originalBakeTemp: state.originalBakeTemp,
  };
  const previousToggle = state.unitToggleSnapshot;

  let from: PanState;
  let to: PanState;
  let originalBakeTemp: string;

  if (
    previousToggle !== null &&
    previousToggle.unit === previousUnit &&
    previousToggle.previousUnit === newUnit
  ) {
    from = restorePanState(
      state.from,
      previousToggle.stateAfterToggle.from,
      previousToggle.stateBeforeToggle.from,
      previousUnit,
      newUnit,
    );
    to = restorePanState(
      state.to,
      previousToggle.stateAfterToggle.to,
      previousToggle.stateBeforeToggle.to,
      previousUnit,
      newUnit,
    );

    originalBakeTemp =
      state.originalBakeTemp ===
      previousToggle.stateAfterToggle.originalBakeTemp
        ? previousToggle.stateBeforeToggle.originalBakeTemp
        : convertBakeTempUnits(state.originalBakeTemp, previousUnit, newUnit);
  } else {
    from = {
      ...convertStateUnits(state.from, previousUnit, newUnit),
      selectedPresetKey: null,
    };
    to = {
      ...convertStateUnits(state.to, previousUnit, newUnit),
      selectedPresetKey: null,
    };
    originalBakeTemp = convertBakeTempUnits(
      state.originalBakeTemp,
      previousUnit,
      newUnit,
    );
  }

  return {
    ...state,
    unit: newUnit,
    from,
    to,
    originalBakeTemp,
    unitToggleSnapshot: {
      unit: newUnit,
      stateAfterToggle: {
        from: { ...from },
        to: { ...to },
        originalBakeTemp,
      },
      previousUnit,
      stateBeforeToggle,
    },
  };
};

const dimensionsFor = (
  state: PanState,
  unit: UnitSystem,
): PanDimensions | null => {
  const lang = getCurrentLocale();
  const cmFrom = (raw: string): number | null => {
    const v = parseQuantity(raw, lang);
    if (v === null || v <= 0) return null;
    return unit === "metric" ? v : panBakewareData.inchesToCm(v);
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
        unit === "metric"
          ? panBakewareData.litersToMl(cap)
          : panBakewareData.cupsToMl(cap);
      return { ...base, capacityMlOverride: capacityMl };
    }
    case "muffin": {
      const cav = parseQuantity(state.cavities, lang);
      const cavCap = parseQuantity(state.cavityCapacity, lang);
      if (cav === null || cavCap === null || cav <= 0 || cavCap <= 0) {
        return null;
      }
      const cavityCapacityMl =
        unit === "metric" ? cavCap : panBakewareData.cupsToMl(cavCap);
      return {
        ...base,
        cavities: Math.round(cav),
        cavityCapacityMl,
      };
    }
  }
};

const createInitialState = (): PanConverterState => ({
  unit: "imperial",
  unitToggleSnapshot: null,
  batterType: "cake",
  from: makeDefaultState("round", "round9x2"),
  to: makeDefaultState("rectangular", "rect9x13"),
  recipeText: "",
  originalBakeTime: "",
  originalBakeTemp: "",
  methodologyExpanded: false,
  referenceExpanded: false,
});

const snapshotStore = createHistoryEntrySnapshotStore<PanConverterState>();

export const PanBakewareConverterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = useIsLoggedIn();

  const restored = snapshotStore.useRestoredSnapshot();
  const [state, setState] = useState<PanConverterState>(
    () => restored ?? createInitialState(),
  );

  snapshotStore.useSaveSnapshot(state);

  const { unit, batterType, from, to } = state;

  const update = (patch: Partial<PanConverterState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const updateSlot = (
    slot: PanSlot,
    updater: (panState: PanState, unit: UnitSystem) => PanState,
  ) => {
    setState((prev) =>
      slot === "from"
        ? { ...prev, from: updater(prev.from, prev.unit) }
        : { ...prev, to: updater(prev.to, prev.unit) },
    );
  };

  const onShapeChange = (slot: PanSlot, shape: PanShape) => {
    updateSlot(slot, (_, currentUnit) => applyShapeChange(shape, currentUnit));
  };

  const selectPreset = (slot: PanSlot, presetKey: string) => {
    updateSlot(slot, (panState, currentUnit) =>
      applyPreset(panState, presetKey, currentUnit),
    );
  };

  const onDimensionInput = (slot: PanSlot, field: PanField, value: string) => {
    updateSlot(slot, (panState) => ({
      ...panState,
      [field]: value,
      selectedPresetKey: null,
    }));
  };

  const onUnitToggle = (newUnit: unknown) => {
    if (newUnit !== "imperial" && newUnit !== "metric") return;
    setState((prev) => toggleUnit(prev, newUnit));
  };

  const swapPans = () => {
    setState((prev) => ({ ...prev, from: prev.to, to: prev.from }));
  };

  const unitLabelShort = t(
    unit === "metric"
      ? "pages.panBakewareConverter.units.cm"
      : "pages.panBakewareConverter.units.in",
  );

  const unitLabelSquare = t(
    unit === "metric"
      ? "pages.panBakewareConverter.units.sqCm"
      : "pages.panBakewareConverter.units.sqIn",
  );

  const capacityUnitLabel = t(
    unit === "metric"
      ? "pages.panBakewareConverter.units.liters"
      : "pages.panBakewareConverter.units.cups",
  );

  const cavityUnitLabel = t(
    unit === "metric"
      ? "pages.panBakewareConverter.units.ml"
      : "pages.panBakewareConverter.units.cups",
  );

  const presetLabel = (preset: PanPreset): string => {
    const key =
      PRESET_FORMAT_KEY_OVERRIDE[preset.key] ?? SHAPE_FORMAT_KEY[preset.shape];
    const fmt = (value: number | undefined): string =>
      value === undefined ? "" : formatDim(value);
    const isMetric = preset.unitSystem === "metric";
    return t(key, {
      u: unitLabelShort,
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
    });
  };

  const capacityLabelFor = (dims: PanDimensions): string => {
    const ml = panBakewareData.panCapacityMl(dims);
    if (ml === null) return "…";
    if (unit === "metric") return panBakewareData.formatMl(ml);
    return t("pages.panBakewareConverter.capacity.valueWithMl", {
      cups: panBakewareData.formatCups(panBakewareData.mlToCups(ml)),
      ml: panBakewareData.formatMl(ml),
    });
  };

  const capacityCompactLabel = (ml: number): string => {
    if (unit === "metric") return panBakewareData.formatMl(ml);
    return t("pages.panBakewareConverter.capacity.value", {
      cups: panBakewareData.formatCups(panBakewareData.mlToCups(ml)),
    });
  };

  const fromDimensions = dimensionsFor(from, unit);
  const toDimensions = dimensionsFor(to, unit);

  const panAreaLabel = (dims: PanDimensions | null): string => {
    if (!dims) return "…";
    const area = panBakewareData.panArea(dims);
    if (area === null) {
      return t("pages.panBakewareConverter.area.notApplicable");
    }
    return t("pages.panBakewareConverter.area.value", {
      area:
        unit === "metric"
          ? area.toFixed(0)
          : panBakewareData.sqCmToSqIn(area).toFixed(1),
      unit: unitLabelSquare,
    });
  };

  const panCapacityLabel = (dims: PanDimensions | null): string => {
    if (!dims) return "…";
    return capacityLabelFor(dims);
  };

  const scaling =
    fromDimensions && toDimensions
      ? panBakewareData.computeScaling(fromDimensions, toDimensions)
      : null;

  const canEstimateBakeTime =
    fromDimensions !== null &&
    panBakewareData.isFlatBottom(fromDimensions.shape) &&
    toDimensions !== null &&
    panBakewareData.isFlatBottom(toDimensions.shape);

  const bakeTimeAdvice =
    fromDimensions && toDimensions && scaling && canEstimateBakeTime
      ? panBakewareData.computeBakeTimeAdvice(fromDimensions, toDimensions)
      : null;

  const substitutions = ((): SubstitutionOption[] => {
    if (!fromDimensions) return [];
    const targetCap = panBakewareData.panCapacityMl(fromDimensions);
    if (targetCap === null) return [];
    const matches = panBakewareData.findSimilarPresets(
      fromDimensions,
      [from.selectedPresetKey, to.selectedPresetKey],
      unit,
      0.1,
    );
    return matches.map((preset) => {
      const cap =
        panBakewareData.panCapacityMl(
          panBakewareData.presetToDimensions(preset),
        ) ?? 0;
      const delta = ((cap - targetCap) / targetCap) * 100;
      return {
        preset,
        label: presetLabel(preset),
        capacityLabel: capacityCompactLabel(cap),
        deltaPct: delta,
      };
    });
  })();

  const negligibleScaling =
    scaling !== null && panBakewareData.isNegligibleScaling(scaling.multiplier);

  const recipeScaledLines = ((): string[] => {
    const text = state.recipeText.trim();
    if (!scaling || !text) return [];
    const scaleStr = panBakewareData.formatMultiplier(scaling.multiplier);
    const parsed = parseIngredients(text, scaleStr, {
      decimalNotationMode: inferIngredientsNotation(text, getCurrentLocale()),
    });
    return parsed.map((line) => line.plaintextContent);
  })();

  const suggested = ((): {
    timeLow: string;
    timeHigh: string;
    tempF: string;
    tempC: string;
  } => {
    if (!bakeTimeAdvice) {
      return { timeLow: "", timeHigh: "", tempF: "", tempC: "" };
    }
    let timeLow = "";
    let timeHigh = "";
    let tempF = "";
    let tempC = "";
    const time = parseQuantity(state.originalBakeTime, getCurrentLocale());
    if (time !== null && time > 0) {
      const low = Math.max(
        1,
        Math.round(time * bakeTimeAdvice.timeMultiplierLow),
      );
      const high = Math.max(
        low,
        Math.round(time * bakeTimeAdvice.timeMultiplierHigh),
      );
      timeLow = String(low);
      timeHigh = String(high);
    }
    const tempIn = parseQuantity(state.originalBakeTemp, getCurrentLocale());
    if (tempIn !== null && tempIn > 0) {
      if (unit === "metric") {
        const newC = tempIn + bakeTimeAdvice.suggestedTempDeltaC;
        tempC = String(Math.round(newC));
        tempF = String(Math.round(celsiusToFahrenheit(newC)));
      } else {
        const newF = tempIn + bakeTimeAdvice.suggestedTempDeltaF;
        tempF = String(Math.round(newF));
        tempC = String(Math.round(fahrenheitToCelsius(newF)));
      }
    }
    return { timeLow, timeHigh, tempF, tempC };
  })();

  const bakeTempChanges =
    bakeTimeAdvice !== null && bakeTimeAdvice.suggestedTempDeltaF !== 0;

  const bakeDirectionColor = ((): keyof typeof BAKE_DIRECTION_CHIP_CLASSES => {
    if (!bakeTimeAdvice) return "medium";
    if (bakeTimeAdvice.direction === "similar") return "success";
    if (bakeTimeAdvice.suggestedTempDeltaF !== 0) return "warning";
    return "primary";
  })();

  const bakeTempInputLabel = t(
    unit === "metric"
      ? "pages.panBakewareConverter.bake.originalTempC"
      : "pages.panBakewareConverter.bake.originalTempF",
  );

  const bakeTempInputPlaceholder = t(
    unit === "metric"
      ? "pages.panBakewareConverter.bake.originalTempPlaceholderC"
      : "pages.panBakewareConverter.bake.originalTempPlaceholderF",
  );

  const multiplierExplanation = (): string => {
    if (!scaling) return "";
    if (unit === "metric") {
      return t("pages.panBakewareConverter.multiplier.explainCapacityMetric", {
        toVolume: panBakewareData.formatMl(scaling.toCapacityMl),
        fromVolume: panBakewareData.formatMl(scaling.fromCapacityMl),
      });
    }
    return t("pages.panBakewareConverter.multiplier.explainCapacity", {
      toCups: panBakewareData.formatCups(
        panBakewareData.mlToCups(scaling.toCapacityMl),
      ),
      fromCups: panBakewareData.formatCups(
        panBakewareData.mlToCups(scaling.fromCapacityMl),
      ),
    });
  };

  const applyToRecipe = async () => {
    if (!scaling) return;

    const data = await openSelectRecipeModal();
    if (!data) return;

    recipeCompletionTrackerService.setRecipeScale(
      data.id,
      panBakewareData.formatMultiplier(scaling.multiplier),
    );
    void navigate({ to: "/recipe/$recipeId", params: { recipeId: data.id } });
  };

  const applySubstitution = (option: SubstitutionOption) => {
    selectPreset("to", option.preset.key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyMultiplier = async () => {
    if (!scaling) return;
    try {
      const value = panBakewareData.formatMultiplier(scaling.multiplier);
      if (Capacitor.isNativePlatform()) {
        await Clipboard.write({ string: value });
      } else {
        await navigator.clipboard.writeText(value);
      }
      showToast({
        message: t("pages.panBakewareConverter.multiplier.copied"),
        duration: 1500,
      });
    } catch {
      return;
    }
  };

  const renderPanCard = (slot: PanSlot) => {
    const panState = slot === "from" ? from : to;
    const dims = slot === "from" ? fromDimensions : toDimensions;
    return (
      <PanCard
        headingId={slot === "from" ? "from-pan-heading" : "to-pan-heading"}
        eyebrow={
          slot === "from"
            ? t("pages.panBakewareConverter.from.eyebrow")
            : t("pages.panBakewareConverter.to.eyebrow")
        }
        title={
          slot === "from"
            ? t("pages.panBakewareConverter.from.title")
            : t("pages.panBakewareConverter.to.title")
        }
        state={panState}
        presets={presetsForShape(panState.shape, unit)}
        presetLabel={presetLabel}
        unitLabelShort={unitLabelShort}
        capacityUnitLabel={capacityUnitLabel}
        cavityUnitLabel={cavityUnitLabel}
        areaLabel={panAreaLabel(dims)}
        capacityLabel={panCapacityLabel(dims)}
        onShapeChange={(shape) => onShapeChange(slot, shape)}
        onPresetSelect={(presetKey) => selectPreset(slot, presetKey)}
        onFieldChange={(field, value) => onDimensionInput(slot, field, value)}
      />
    );
  };

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/tools" }} />}
        title={t("pages.panBakewareConverter.title")}
      />
      <PageContent>
        <div className="mx-auto max-w-page pb-[25vh]">
          <InfoBlock
            className="mb-4"
            icon={<Maximize2Icon />}
            title={t("pages.panBakewareConverter.intro.title")}
          >
            <p>{t("pages.panBakewareConverter.intro.bodyVolume")}</p>
          </InfoBlock>

          <Tabs className="mb-4" value={unit} onValueChange={onUnitToggle}>
            <TabsList className="h-auto min-h-10 w-full">
              <TabsTrigger value="imperial" className="whitespace-normal">
                {t("pages.panBakewareConverter.units.imperial")}
              </TabsTrigger>
              <TabsTrigger value="metric" className="whitespace-normal">
                {t("pages.panBakewareConverter.units.metric")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {renderPanCard("from")}

          <div className="-mt-1 mb-2 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary"
              onClick={swapPans}
            >
              <ArrowLeftRightIcon data-icon="inline-start" />
              {t("pages.panBakewareConverter.swap")}
            </Button>
          </div>

          {renderPanCard("to")}

          {scaling ? (
            <>
              <section
                aria-labelledby="result-heading"
                className="mb-4 rounded-xl border border-primary bg-primary/8 p-[18px] text-center"
              >
                <header>
                  {negligibleScaling ? (
                    <>
                      <p className="text-[0.72rem] font-bold tracking-[0.08em] text-primary uppercase">
                        {t("pages.panBakewareConverter.result.eyebrowNoScale")}
                      </p>
                      <h2
                        id="result-heading"
                        className="mt-1.5 mb-1 text-[1.4rem] leading-[1.2] font-extrabold text-primary"
                      >
                        {t("pages.panBakewareConverter.result.useAsIs")}
                      </h2>
                      <p className="mx-auto mt-1.5 max-w-[32em] text-[0.82rem] leading-[1.4] text-muted-foreground">
                        {t("pages.panBakewareConverter.result.noScaleExplain", {
                          multiplier: panBakewareData.formatMultiplier(
                            scaling.multiplier,
                          ),
                        })}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[0.72rem] font-bold tracking-[0.08em] text-primary uppercase">
                        {t("pages.panBakewareConverter.result.eyebrow")}
                      </p>
                      <h2
                        id="result-heading"
                        className="mt-1.5 mb-1 text-[2.6rem] leading-[1.05] font-extrabold text-primary tabular-nums"
                      >
                        <bdi>
                          ×{" "}
                          {panBakewareData.formatMultiplier(scaling.multiplier)}
                        </bdi>
                      </h2>
                      <p className="text-[0.85rem] font-semibold">
                        {t("pages.panBakewareConverter.multiplier.basis")}
                      </p>
                      <p className="mx-auto mt-1.5 max-w-[32em] text-[0.82rem] leading-[1.4] text-muted-foreground">
                        {multiplierExplanation()}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 text-primary hover:text-primary"
                        onClick={() => void copyMultiplier()}
                      >
                        <CopyIcon data-icon="inline-start" />
                        {t("pages.panBakewareConverter.multiplier.copy")}
                      </Button>
                    </>
                  )}
                </header>
                {!negligibleScaling && (
                  <p className="mx-auto mt-3 max-w-[32em] text-[0.78rem] leading-[1.45] text-muted-foreground">
                    {t("pages.panBakewareConverter.recipeScaler.caveat")}
                  </p>
                )}
              </section>

              {substitutions.length > 0 && (
                <section
                  aria-labelledby="subs-heading"
                  className="mb-4 rounded-xl border px-4 py-3.5"
                >
                  <header className="mb-2.5 flex flex-col gap-0.5">
                    <h3 id="subs-heading" className="text-base font-bold">
                      {t("pages.panBakewareConverter.substitutions.title")}
                    </h3>
                    <p className="text-[0.82rem] leading-[1.4] text-muted-foreground">
                      {t("pages.panBakewareConverter.substitutions.subtitle")}
                    </p>
                  </header>
                  <ul className="flex flex-col gap-1">
                    {substitutions.map((sub) => (
                      <li key={sub.preset.key}>
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2.5 text-start text-[0.88rem] hover:bg-muted"
                          onClick={() => applySubstitution(sub)}
                        >
                          <span className="font-semibold">{sub.label}</span>
                          <span className="text-[0.78rem] whitespace-nowrap text-muted-foreground tabular-nums">
                            {sub.capacityLabel}
                            <bdi className="ms-1">
                              ({sub.deltaPct >= 0 ? "+" : ""}
                              {sub.deltaPct.toFixed(0)}%)
                            </bdi>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {!isLoggedIn ? (
                <section
                  aria-labelledby="recipe-scaler-heading"
                  className="mb-4 rounded-xl border px-4 py-3.5"
                >
                  <header className="mb-2.5 flex flex-col gap-0.5">
                    <h3
                      id="recipe-scaler-heading"
                      className="text-base font-bold"
                    >
                      {t("pages.panBakewareConverter.recipeScaler.title")}
                    </h3>
                    <p className="text-[0.82rem] leading-[1.4] text-muted-foreground">
                      {t("pages.panBakewareConverter.recipeScaler.subtitle")}
                    </p>
                  </header>
                  <div className="mb-2.5">
                    <TextArea
                      aria-label={t(
                        "pages.panBakewareConverter.recipeScaler.title",
                      )}
                      placeholder={t(
                        "pages.panBakewareConverter.recipeScaler.placeholder",
                      )}
                      value={state.recipeText}
                      onValueChange={(recipeText) => update({ recipeText })}
                      rows={4}
                      autoGrow
                    />
                  </div>
                  {recipeScaledLines.length > 0 && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-lg bg-primary/8 px-3 py-2.5"
                    >
                      <p className="mb-1.5 text-[0.72rem] font-bold tracking-[0.06em] text-primary uppercase">
                        {t(
                          "pages.panBakewareConverter.recipeScaler.outputLabel",
                        )}
                      </p>
                      <ul>
                        {recipeScaledLines.map((line, idx) => (
                          <li
                            key={idx}
                            dir="auto"
                            className="py-0.5 text-[0.9rem] leading-[1.45]"
                          >
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              ) : (
                <section
                  aria-labelledby="recipe-apply-heading"
                  className="mb-4 rounded-xl border px-4 py-3.5"
                >
                  <header className="mb-2.5 flex flex-col gap-0.5">
                    <h3
                      id="recipe-apply-heading"
                      className="text-base font-bold"
                    >
                      {t("pages.panBakewareConverter.recipeApply.title")}
                    </h3>
                    <p className="text-[0.82rem] leading-[1.4] text-muted-foreground">
                      {t("pages.panBakewareConverter.recipeApply.subtitle")}
                    </p>
                  </header>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-primary text-primary"
                    onClick={() => void applyToRecipe()}
                  >
                    <SearchIcon data-icon="inline-start" />
                    {t("pages.panBakewareConverter.recipeApply.button")}
                  </Button>
                </section>
              )}

              <section
                aria-labelledby="bake-heading"
                className="mb-4 rounded-xl border px-4 py-3.5"
              >
                <header className="mb-2.5">
                  <h3 id="bake-heading" className="text-base font-bold">
                    {t("pages.panBakewareConverter.bake.title")}
                  </h3>
                </header>

                <p className="mb-2 text-[0.72rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                  {t("pages.panBakewareConverter.batterType.label")}
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {panBakewareData.BATTER_TYPES.map((type) => (
                    <ToggleChip
                      key={type}
                      className="h-[30px]"
                      pressed={batterType === type}
                      onClick={() => update({ batterType: type })}
                    >
                      {t(BATTER_TYPE_LABEL_KEY[type])}
                    </ToggleChip>
                  ))}
                </div>

                {bakeTimeAdvice ? (
                  <>
                    <span
                      className={cn(
                        "mb-3 inline-flex h-6 items-center gap-1 rounded-full border ps-2 pe-2.5 text-[0.72rem] leading-none [&_svg]:size-[0.9rem]",
                        BAKE_DIRECTION_CHIP_CLASSES[bakeDirectionColor],
                      )}
                    >
                      {bakeTimeAdvice.direction === "similar" ? (
                        <CircleCheckIcon aria-hidden="true" />
                      ) : (
                        <FlameIcon aria-hidden="true" />
                      )}
                      <span>
                        {t(BAKE_DIRECTION_LABEL_KEYS[bakeTimeAdvice.direction])}
                      </span>
                    </span>
                    <p className="mb-3 text-[0.85rem] leading-[1.45]">
                      {t(BAKE_DETAIL_KEYS[bakeTimeAdvice.direction])}
                    </p>

                    <div className="mb-2.5 grid grid-cols-[minmax(0,1.2fr)_minmax(70px,110px)_auto_minmax(0,1.1fr)] items-center gap-2.5">
                      <span className="text-[0.85rem] font-semibold">
                        {t("pages.panBakewareConverter.bake.originalTime")}
                      </span>
                      <TextField
                        type="text"
                        inputMode="decimal"
                        aria-label={t(
                          "pages.panBakewareConverter.bake.originalTime",
                        )}
                        placeholder={t(
                          "pages.panBakewareConverter.bake.originalTimePlaceholder",
                        )}
                        value={state.originalBakeTime}
                        onValueChange={(originalBakeTime) =>
                          update({ originalBakeTime })
                        }
                      />
                      <ArrowRightIcon
                        aria-hidden="true"
                        className="size-[1.1rem] justify-self-center text-muted-foreground rtl:rotate-180"
                      />
                      <span
                        className="text-end text-[1.05rem] font-bold text-primary tabular-nums"
                        aria-label={t(
                          "pages.panBakewareConverter.bake.suggestedTime",
                        )}
                      >
                        {suggested.timeLow
                          ? t("pages.panBakewareConverter.bake.timeRange", {
                              low: suggested.timeLow,
                              high: suggested.timeHigh,
                            })
                          : "…"}
                      </span>

                      <span className="text-[0.85rem] font-semibold">
                        {bakeTempInputLabel}
                      </span>
                      <TextField
                        type="text"
                        inputMode="decimal"
                        aria-label={bakeTempInputLabel}
                        placeholder={bakeTempInputPlaceholder}
                        value={state.originalBakeTemp}
                        onValueChange={(originalBakeTemp) =>
                          update({ originalBakeTemp })
                        }
                      />
                      <ArrowRightIcon
                        aria-hidden="true"
                        className="size-[1.1rem] justify-self-center text-muted-foreground rtl:rotate-180"
                      />
                      <span
                        className="text-end text-[1.05rem] font-bold text-primary tabular-nums"
                        aria-label={t(
                          "pages.panBakewareConverter.bake.suggestedTemp",
                        )}
                      >
                        {suggested.tempF
                          ? bakeTempChanges
                            ? unit === "metric"
                              ? t(
                                  "pages.panBakewareConverter.bake.tempResultMetric",
                                  { f: suggested.tempF, c: suggested.tempC },
                                )
                              : t(
                                  "pages.panBakewareConverter.bake.tempResultImperial",
                                  { f: suggested.tempF, c: suggested.tempC },
                                )
                            : t("pages.panBakewareConverter.bake.tempSame")
                          : "…"}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="mb-3 text-[0.85rem] leading-[1.45]">
                    {t("pages.panBakewareConverter.bake.noEstimate")}
                  </p>
                )}

                <div className="mb-2.5 rounded-lg bg-muted/60 px-3 py-2.5">
                  <p className="mb-1 text-[0.72rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    {t("pages.panBakewareConverter.doneness.label")}
                  </p>
                  <p className="text-[0.85rem] leading-[1.45]">
                    {t(DONENESS_KEY[batterType])}
                  </p>
                </div>
                <p className="text-[0.72rem] leading-[1.4] text-muted-foreground">
                  {t("pages.panBakewareConverter.bake.footnoteRange")}
                </p>
              </section>
            </>
          ) : (
            <aside
              role="status"
              className="mb-4 flex gap-3 rounded-lg border bg-muted/50 px-4 py-3"
            >
              <InfoIcon
                aria-hidden="true"
                className="size-[1.3rem] shrink-0 text-muted-foreground"
              />
              <div>
                <p className="mb-1 text-[0.9rem] font-bold">
                  {t("pages.panBakewareConverter.incomplete.title")}
                </p>
                <p className="text-[0.85rem] leading-[1.45]">
                  {t("pages.panBakewareConverter.incomplete.body")}
                </p>
              </div>
            </aside>
          )}

          <button
            type="button"
            aria-expanded={state.methodologyExpanded}
            className="mt-2 flex min-h-9 w-full items-center gap-2 rounded-lg px-4 text-start text-[0.85rem] text-muted-foreground hover:bg-muted"
            onClick={() =>
              update({ methodologyExpanded: !state.methodologyExpanded })
            }
          >
            {state.methodologyExpanded ? (
              <ChevronUpIcon aria-hidden="true" className="size-5" />
            ) : (
              <ChevronDownIcon aria-hidden="true" className="size-5" />
            )}
            <span>{t("pages.panBakewareConverter.methodology.toggle")}</span>
          </button>

          {state.methodologyExpanded && (
            <div className="mt-2 mb-4 rounded-lg border px-4 py-3 text-[0.85rem] leading-normal [&>p]:mb-2 [&>p:last-child]:mb-0">
              <p className="text-[0.95rem] font-bold">
                {t("pages.panBakewareConverter.methodology.title")}
              </p>
              <p>{t("pages.panBakewareConverter.methodology.body1Volume")}</p>
              <p>{t("pages.panBakewareConverter.methodology.body2")}</p>
              <p>{t("pages.panBakewareConverter.methodology.body3Doneness")}</p>
              <p>{t("pages.panBakewareConverter.methodology.tip")}</p>
              <p className="mt-2.5 text-[0.72rem] text-muted-foreground">
                {t("pages.panBakewareConverter.methodology.sources")}
              </p>
            </div>
          )}

          <button
            type="button"
            aria-expanded={state.referenceExpanded}
            className="mt-2 flex min-h-9 w-full items-center gap-2 rounded-lg px-4 text-start text-[0.85rem] text-muted-foreground hover:bg-muted"
            onClick={() =>
              update({ referenceExpanded: !state.referenceExpanded })
            }
          >
            {state.referenceExpanded ? (
              <ChevronUpIcon aria-hidden="true" className="size-5" />
            ) : (
              <ChevronDownIcon aria-hidden="true" className="size-5" />
            )}
            <span>{t("pages.panBakewareConverter.reference.toggle")}</span>
          </button>

          {state.referenceExpanded && (
            <div className="mt-2 mb-4 rounded-lg border px-4 py-3 text-[0.85rem] leading-normal">
              <p className="mb-2 text-[0.95rem] font-bold">
                {t("pages.panBakewareConverter.reference.title")}
              </p>
              {panBakewareData.PAN_SHAPES.map((shape) => {
                const presets = presetsForShape(shape, unit);
                if (presets.length === 0) return null;
                return (
                  <div key={shape}>
                    <p className="mt-3.5 mb-2 text-[0.78rem] font-bold tracking-[0.05em] text-muted-foreground uppercase">
                      {t(SHAPE_LABEL_KEYS[shape])}
                    </p>
                    <div className="mb-2 flex flex-col">
                      <div className="grid grid-cols-[1fr_1.2fr] gap-2 border-b py-[5px] text-[0.75rem] font-bold tracking-[0.04em] text-muted-foreground uppercase">
                        <span>
                          {t("pages.panBakewareConverter.reference.colPan")}
                        </span>
                        <span>
                          {t(
                            "pages.panBakewareConverter.reference.colCapacity",
                          )}
                        </span>
                      </div>
                      {presets.map((preset) => (
                        <div
                          key={preset.key}
                          className="grid grid-cols-[1fr_1.2fr] gap-2 border-b py-[5px] text-[0.82rem]"
                        >
                          <span>{presetLabel(preset)}</span>
                          <span>
                            {capacityLabelFor(
                              panBakewareData.presetToDimensions(preset),
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageContent>
    </>
  );
};
