export type PanShape =
  | "round"
  | "square"
  | "rectangular"
  | "loaf"
  | "springform"
  | "bundtTube"
  | "sheet"
  | "muffin";

export type UnitSystem = "imperial" | "metric";

export const PAN_SHAPES: PanShape[] = [
  "round",
  "square",
  "rectangular",
  "loaf",
  "springform",
  "sheet",
  "bundtTube",
  "muffin",
];

export const FLAT_BOTTOM_SHAPES: ReadonlySet<PanShape> = new Set<PanShape>([
  "round",
  "square",
  "rectangular",
  "loaf",
  "springform",
  "sheet",
]);

export interface PanDimensions {
  shape: PanShape;
  diameterCm?: number;
  lengthCm?: number;
  widthCm?: number;
  depthCm: number;
  capacityMlOverride?: number;
  cavities?: number;
  cavityCapacityMl?: number;
}

export interface PanPreset {
  key: string;
  shape: PanShape;
  unitSystem: UnitSystem;
  diameter?: number;
  length?: number;
  width?: number;
  depth?: number;
  capacityOverride?: number;
  cavities?: number;
  cavityCapacity?: number;
}

export type BatterType =
  | "cake"
  | "spongeFoam"
  | "quickBread"
  | "yeastBread"
  | "cheesecake"
  | "brownieBar";

export const BATTER_TYPES: BatterType[] = [
  "cake",
  "spongeFoam",
  "quickBread",
  "yeastBread",
  "cheesecake",
  "brownieBar",
];

export const isFlatBottom = (shape: PanShape): boolean =>
  FLAT_BOTTOM_SHAPES.has(shape);

export const inchesToCm = (inches: number): number => inches * 2.54;
export const cmToInches = (cm: number): number => cm / 2.54;
export const sqCmToSqIn = (sqCm: number): number => sqCm / 6.4516;

const ML_PER_CUP = 236.5882365;
export const cupsToMl = (cups: number): number => cups * ML_PER_CUP;
export const mlToCups = (ml: number): number => ml / ML_PER_CUP;
export const litersToMl = (liters: number): number => liters * 1000;
export const mlToLiters = (ml: number): number => ml / 1000;

export const panArea = (p: PanDimensions): number | null => {
  switch (p.shape) {
    case "round":
    case "springform":
      if (p.diameterCm === undefined) return null;
      return Math.PI * (p.diameterCm / 2) ** 2;
    case "square":
      if (p.lengthCm === undefined) return null;
      return p.lengthCm * p.lengthCm;
    case "rectangular":
    case "loaf":
    case "sheet":
      if (p.lengthCm === undefined || p.widthCm === undefined) return null;
      return p.lengthCm * p.widthCm;
    case "bundtTube":
    case "muffin":
      return null;
  }
};

export const panCapacityMl = (p: PanDimensions): number | null => {
  if (p.capacityMlOverride !== undefined) return p.capacityMlOverride;
  if (p.shape === "muffin") {
    if (p.cavities === undefined || p.cavityCapacityMl === undefined) {
      return null;
    }
    return p.cavities * p.cavityCapacityMl;
  }
  const area = panArea(p);
  if (area === null) return null;
  return area * p.depthCm;
};

export const presetToDimensions = (p: PanPreset): PanDimensions => {
  const linear = (v: number | undefined): number | undefined => {
    if (v === undefined) return undefined;
    return p.unitSystem === "metric" ? v : inchesToCm(v);
  };
  const capacityMl =
    p.capacityOverride === undefined
      ? undefined
      : p.unitSystem === "metric"
        ? litersToMl(p.capacityOverride)
        : cupsToMl(p.capacityOverride);
  const cavityCapacityMl =
    p.cavityCapacity === undefined
      ? undefined
      : p.unitSystem === "metric"
        ? p.cavityCapacity
        : cupsToMl(p.cavityCapacity);
  return {
    shape: p.shape,
    diameterCm: linear(p.diameter),
    lengthCm: linear(p.length),
    widthCm: linear(p.width),
    depthCm: linear(p.depth) ?? 0,
    capacityMlOverride: capacityMl,
    cavities: p.cavities,
    cavityCapacityMl,
  };
};

export const PAN_PRESETS_IMPERIAL: PanPreset[] = [
  {
    key: "round6x2",
    shape: "round",
    unitSystem: "imperial",
    diameter: 6,
    depth: 2,
  },
  {
    key: "round7x2",
    shape: "round",
    unitSystem: "imperial",
    diameter: 7,
    depth: 2,
  },
  {
    key: "round8x2",
    shape: "round",
    unitSystem: "imperial",
    diameter: 8,
    depth: 2,
  },
  {
    key: "round9x2",
    shape: "round",
    unitSystem: "imperial",
    diameter: 9,
    depth: 2,
  },
  {
    key: "round10x2",
    shape: "round",
    unitSystem: "imperial",
    diameter: 10,
    depth: 2,
  },
  {
    key: "round12x2",
    shape: "round",
    unitSystem: "imperial",
    diameter: 12,
    depth: 2,
  },
  {
    key: "pie9x1_5",
    shape: "round",
    unitSystem: "imperial",
    diameter: 9,
    depth: 1.5,
  },
  {
    key: "pie9x2DeepDish",
    shape: "round",
    unitSystem: "imperial",
    diameter: 9.5,
    depth: 2,
  },

  {
    key: "square6x6",
    shape: "square",
    unitSystem: "imperial",
    length: 6,
    depth: 2,
  },
  {
    key: "square8x8",
    shape: "square",
    unitSystem: "imperial",
    length: 8,
    depth: 2,
  },
  {
    key: "square9x9",
    shape: "square",
    unitSystem: "imperial",
    length: 9,
    depth: 2,
  },
  {
    key: "square10x10",
    shape: "square",
    unitSystem: "imperial",
    length: 10,
    depth: 2,
  },

  {
    key: "rect7x11",
    shape: "rectangular",
    unitSystem: "imperial",
    length: 11,
    width: 7,
    depth: 2,
  },
  {
    key: "rect9x13",
    shape: "rectangular",
    unitSystem: "imperial",
    length: 13,
    width: 9,
    depth: 2,
  },
  {
    key: "rect10x15",
    shape: "rectangular",
    unitSystem: "imperial",
    length: 15,
    width: 10,
    depth: 2,
  },

  {
    key: "loafMini",
    shape: "loaf",
    unitSystem: "imperial",
    length: 5.75,
    width: 3.25,
    depth: 2.25,
  },
  {
    key: "loaf8x4",
    shape: "loaf",
    unitSystem: "imperial",
    length: 8,
    width: 4,
    depth: 2.5,
  },
  {
    key: "loaf85x45",
    shape: "loaf",
    unitSystem: "imperial",
    length: 8.5,
    width: 4.5,
    depth: 2.5,
  },
  {
    key: "loaf9x5",
    shape: "loaf",
    unitSystem: "imperial",
    length: 9,
    width: 5,
    depth: 3,
  },

  {
    key: "springform7",
    shape: "springform",
    unitSystem: "imperial",
    diameter: 7,
    depth: 3,
  },
  {
    key: "springform8",
    shape: "springform",
    unitSystem: "imperial",
    diameter: 8,
    depth: 3,
  },
  {
    key: "springform9",
    shape: "springform",
    unitSystem: "imperial",
    diameter: 9,
    depth: 3,
  },
  {
    key: "springform10",
    shape: "springform",
    unitSystem: "imperial",
    diameter: 10,
    depth: 3,
  },

  {
    key: "quarterSheet",
    shape: "sheet",
    unitSystem: "imperial",
    length: 13,
    width: 9,
    depth: 1,
  },
  {
    key: "halfSheet",
    shape: "sheet",
    unitSystem: "imperial",
    length: 18,
    width: 13,
    depth: 1,
  },
  {
    key: "fullSheet",
    shape: "sheet",
    unitSystem: "imperial",
    length: 26,
    width: 18,
    depth: 1,
  },
  {
    key: "jellyRoll10x15",
    shape: "sheet",
    unitSystem: "imperial",
    length: 15,
    width: 10,
    depth: 1,
  },
  {
    key: "jellyRoll12x17",
    shape: "sheet",
    unitSystem: "imperial",
    length: 17,
    width: 12,
    depth: 1,
  },

  {
    key: "bundt6cup",
    shape: "bundtTube",
    unitSystem: "imperial",
    depth: 3,
    capacityOverride: 6,
  },
  {
    key: "bundt9cup",
    shape: "bundtTube",
    unitSystem: "imperial",
    depth: 3,
    capacityOverride: 9,
  },
  {
    key: "bundt10cup",
    shape: "bundtTube",
    unitSystem: "imperial",
    depth: 3.5,
    capacityOverride: 10,
  },
  {
    key: "bundt12cup",
    shape: "bundtTube",
    unitSystem: "imperial",
    depth: 3.5,
    capacityOverride: 12,
  },
  {
    key: "bundt15cup",
    shape: "bundtTube",
    unitSystem: "imperial",
    depth: 4,
    capacityOverride: 15,
  },
  {
    key: "tube9",
    shape: "bundtTube",
    unitSystem: "imperial",
    diameter: 9,
    depth: 4,
    capacityOverride: 12,
  },
  {
    key: "tube10",
    shape: "bundtTube",
    unitSystem: "imperial",
    diameter: 10,
    depth: 4,
    capacityOverride: 16,
  },

  {
    key: "muffinMini24",
    shape: "muffin",
    unitSystem: "imperial",
    depth: 0.75,
    cavities: 24,
    cavityCapacity: 0.125,
  },
  {
    key: "muffinStandard6",
    shape: "muffin",
    unitSystem: "imperial",
    depth: 1.25,
    cavities: 6,
    cavityCapacity: 0.5,
  },
  {
    key: "muffinStandard12",
    shape: "muffin",
    unitSystem: "imperial",
    depth: 1.25,
    cavities: 12,
    cavityCapacity: 0.5,
  },
  {
    key: "muffinJumbo6",
    shape: "muffin",
    unitSystem: "imperial",
    depth: 1.75,
    cavities: 6,
    cavityCapacity: 1,
  },
];

export const PAN_PRESETS_METRIC: PanPreset[] = [
  {
    key: "roundM15",
    shape: "round",
    unitSystem: "metric",
    diameter: 15,
    depth: 5,
  },
  {
    key: "roundM18",
    shape: "round",
    unitSystem: "metric",
    diameter: 18,
    depth: 5,
  },
  {
    key: "roundM20",
    shape: "round",
    unitSystem: "metric",
    diameter: 20,
    depth: 5,
  },
  {
    key: "roundM22",
    shape: "round",
    unitSystem: "metric",
    diameter: 22,
    depth: 5,
  },
  {
    key: "roundM23",
    shape: "round",
    unitSystem: "metric",
    diameter: 23,
    depth: 5,
  },
  {
    key: "roundM24",
    shape: "round",
    unitSystem: "metric",
    diameter: 24,
    depth: 5,
  },
  {
    key: "roundM25",
    shape: "round",
    unitSystem: "metric",
    diameter: 25,
    depth: 5,
  },
  {
    key: "roundM26",
    shape: "round",
    unitSystem: "metric",
    diameter: 26,
    depth: 5,
  },

  {
    key: "squareM15",
    shape: "square",
    unitSystem: "metric",
    length: 15,
    depth: 5,
  },
  {
    key: "squareM18",
    shape: "square",
    unitSystem: "metric",
    length: 18,
    depth: 5,
  },
  {
    key: "squareM20",
    shape: "square",
    unitSystem: "metric",
    length: 20,
    depth: 5,
  },
  {
    key: "squareM22",
    shape: "square",
    unitSystem: "metric",
    length: 22,
    depth: 5,
  },
  {
    key: "squareM23",
    shape: "square",
    unitSystem: "metric",
    length: 23,
    depth: 5,
  },
  {
    key: "squareM24",
    shape: "square",
    unitSystem: "metric",
    length: 24,
    depth: 5,
  },

  {
    key: "rectM20x30",
    shape: "rectangular",
    unitSystem: "metric",
    length: 30,
    width: 20,
    depth: 5,
  },
  {
    key: "rectM23x33",
    shape: "rectangular",
    unitSystem: "metric",
    length: 33,
    width: 23,
    depth: 5,
  },
  {
    key: "rectM30x40",
    shape: "rectangular",
    unitSystem: "metric",
    length: 40,
    width: 30,
    depth: 5,
  },

  {
    key: "loafMmini",
    shape: "loaf",
    unitSystem: "metric",
    length: 15,
    width: 8,
    depth: 6,
  },
  {
    key: "loafM20x10",
    shape: "loaf",
    unitSystem: "metric",
    length: 20,
    width: 10,
    depth: 7,
  },
  {
    key: "loafM21x11",
    shape: "loaf",
    unitSystem: "metric",
    length: 21,
    width: 11,
    depth: 7,
  },
  {
    key: "loafM23x13",
    shape: "loaf",
    unitSystem: "metric",
    length: 23,
    width: 13,
    depth: 7,
  },

  {
    key: "springformM18",
    shape: "springform",
    unitSystem: "metric",
    diameter: 18,
    depth: 7,
  },
  {
    key: "springformM20",
    shape: "springform",
    unitSystem: "metric",
    diameter: 20,
    depth: 7,
  },
  {
    key: "springformM22",
    shape: "springform",
    unitSystem: "metric",
    diameter: 22,
    depth: 7,
  },
  {
    key: "springformM23",
    shape: "springform",
    unitSystem: "metric",
    diameter: 23,
    depth: 7,
  },
  {
    key: "springformM24",
    shape: "springform",
    unitSystem: "metric",
    diameter: 24,
    depth: 7,
  },
  {
    key: "springformM26",
    shape: "springform",
    unitSystem: "metric",
    diameter: 26,
    depth: 7,
  },
  {
    key: "springformM28",
    shape: "springform",
    unitSystem: "metric",
    diameter: 28,
    depth: 7,
  },

  {
    key: "swissRollM30x20",
    shape: "sheet",
    unitSystem: "metric",
    length: 30,
    width: 20,
    depth: 2,
  },
  {
    key: "swissRollM33x23",
    shape: "sheet",
    unitSystem: "metric",
    length: 33,
    width: 23,
    depth: 2,
  },
  {
    key: "bakingTrayM40x30",
    shape: "sheet",
    unitSystem: "metric",
    length: 40,
    width: 30,
    depth: 2,
  },

  {
    key: "bundtM14",
    shape: "bundtTube",
    unitSystem: "metric",
    depth: 9,
    capacityOverride: 1.4,
  },
  {
    key: "bundtM21",
    shape: "bundtTube",
    unitSystem: "metric",
    depth: 9,
    capacityOverride: 2.1,
  },
  {
    key: "bundtM24",
    shape: "bundtTube",
    unitSystem: "metric",
    depth: 9,
    capacityOverride: 2.4,
  },
  {
    key: "bundtM28",
    shape: "bundtTube",
    unitSystem: "metric",
    depth: 9,
    capacityOverride: 2.8,
  },
  {
    key: "tubeM25",
    shape: "bundtTube",
    unitSystem: "metric",
    diameter: 25,
    depth: 10,
    capacityOverride: 4,
  },

  {
    key: "muffinMmini24",
    shape: "muffin",
    unitSystem: "metric",
    depth: 2,
    cavities: 24,
    cavityCapacity: 30,
  },
  {
    key: "muffinMstandard6",
    shape: "muffin",
    unitSystem: "metric",
    depth: 3,
    cavities: 6,
    cavityCapacity: 100,
  },
  {
    key: "muffinMstandard12",
    shape: "muffin",
    unitSystem: "metric",
    depth: 3,
    cavities: 12,
    cavityCapacity: 100,
  },
  {
    key: "muffinMjumbo6",
    shape: "muffin",
    unitSystem: "metric",
    depth: 4,
    cavities: 6,
    cavityCapacity: 200,
  },
];

export const presetsForUnit = (unitSystem: UnitSystem): PanPreset[] =>
  unitSystem === "metric" ? PAN_PRESETS_METRIC : PAN_PRESETS_IMPERIAL;

export interface ScalingResult {
  multiplier: number;
  fromCapacityMl: number;
  toCapacityMl: number;
}

export const computeScaling = (
  from: PanDimensions,
  to: PanDimensions,
): ScalingResult | null => {
  const fromCap = panCapacityMl(from);
  const toCap = panCapacityMl(to);

  if (fromCap === null || toCap === null || fromCap <= 0 || toCap <= 0) {
    return null;
  }

  return {
    multiplier: toCap / fromCap,
    fromCapacityMl: fromCap,
    toCapacityMl: toCap,
  };
};

export type BakeTimeDirection = "shallower" | "deeper" | "similar";

export interface BakeTimeAdvice {
  direction: BakeTimeDirection;
  timeMultiplierLow: number;
  timeMultiplierHigh: number;
  suggestedTempDeltaF: number;
  suggestedTempDeltaC: number;
}

export const computeBakeTimeAdvice = (
  from: PanDimensions,
  to: PanDimensions,
): BakeTimeAdvice => {
  const depthRatio = from.depthCm > 0 ? to.depthCm / from.depthCm : 1;

  let direction: BakeTimeDirection = "similar";
  if (depthRatio < 0.85) direction = "shallower";
  else if (depthRatio > 1.15) direction = "deeper";

  const center = Math.sqrt(depthRatio);

  let suggestedTempDeltaF = 0;
  let suggestedTempDeltaC = 0;
  if (depthRatio > 1.4) {
    suggestedTempDeltaF = -25;
    suggestedTempDeltaC = -15;
  } else if (depthRatio < 0.7) {
    suggestedTempDeltaF = 25;
    suggestedTempDeltaC = 15;
  }

  return {
    direction,
    timeMultiplierLow: center * 0.9,
    timeMultiplierHigh: center * 1.1,
    suggestedTempDeltaF,
    suggestedTempDeltaC,
  };
};

export const findSimilarPresets = (
  target: PanDimensions,
  excludeKeys: Array<string | null>,
  unitSystem: UnitSystem,
  tolerance = 0.1,
): PanPreset[] => {
  const targetCap = panCapacityMl(target);
  if (targetCap === null) return [];

  const targetFlat = isFlatBottom(target.shape);
  const shapeCompatible = (shape: PanShape): boolean =>
    targetFlat ? isFlatBottom(shape) : shape === target.shape;

  return presetsForUnit(unitSystem)
    .map((preset) => ({
      preset,
      cap: panCapacityMl(presetToDimensions(preset)),
    }))
    .filter(
      (entry): entry is { preset: PanPreset; cap: number } =>
        entry.cap !== null &&
        !excludeKeys.includes(entry.preset.key) &&
        shapeCompatible(entry.preset.shape) &&
        Math.abs(entry.cap - targetCap) / targetCap <= tolerance,
    )
    .sort((a, b) => Math.abs(a.cap - targetCap) - Math.abs(b.cap - targetCap))
    .slice(0, 6)
    .map((entry) => entry.preset);
};

export const formatCups = (cups: number): string => {
  if (!Number.isFinite(cups)) return "";
  if (cups >= 10) return cups.toFixed(0);
  if (cups >= 1) return cups.toFixed(1);
  return cups.toFixed(2);
};

const trimTrailingZero = (value: number): string => {
  if (Math.abs(value - Math.round(value)) < 0.05) {
    return String(Math.round(value));
  }
  return value.toFixed(1);
};

export const formatInches = (inches: number): string => {
  if (!Number.isFinite(inches)) return "";
  return trimTrailingZero(inches);
};

export const formatCm = (cm: number): string => {
  if (!Number.isFinite(cm)) return "";
  return trimTrailingZero(cm);
};

export const formatLiters = (liters: number): string => {
  if (!Number.isFinite(liters)) return "";
  return trimTrailingZero(liters);
};

export const formatMl = (ml: number): string => {
  if (!Number.isFinite(ml)) return "";
  if (ml >= 1000) return (ml / 1000).toFixed(2) + " L";
  return Math.round(ml / 10) * 10 + " mL";
};

export const formatMultiplier = (multiplier: number): string => {
  if (!Number.isFinite(multiplier)) return "";
  if (multiplier >= 10) return multiplier.toFixed(1);
  if (multiplier >= 1) return multiplier.toFixed(2);
  return multiplier.toFixed(3);
};

export const NO_SCALING_THRESHOLD = 0.05;

export const isNegligibleScaling = (multiplier: number): boolean =>
  Number.isFinite(multiplier) &&
  Math.abs(multiplier - 1) <= NO_SCALING_THRESHOLD;
