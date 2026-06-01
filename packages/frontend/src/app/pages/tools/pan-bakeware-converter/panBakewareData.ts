export type PanShape =
  | "round"
  | "square"
  | "rectangular"
  | "loaf"
  | "springform"
  | "bundtTube"
  | "sheet"
  | "muffin";

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
  diameterIn?: number;
  lengthIn?: number;
  widthIn?: number;
  depthIn: number;
  capacityCupsOverride?: number;
  cavities?: number;
  cavityCapacityCups?: number;
}

export interface PanPreset extends PanDimensions {
  key: string;
}

const CUBIC_INCHES_PER_CUP = 14.4375;

export const isFlatBottom = (shape: PanShape): boolean =>
  FLAT_BOTTOM_SHAPES.has(shape);

export const panArea = (p: PanDimensions): number | null => {
  switch (p.shape) {
    case "round":
    case "springform":
      if (p.diameterIn === undefined) return null;
      return Math.PI * (p.diameterIn / 2) ** 2;
    case "square":
      if (p.lengthIn === undefined) return null;
      return p.lengthIn * p.lengthIn;
    case "rectangular":
    case "loaf":
    case "sheet":
      if (p.lengthIn === undefined || p.widthIn === undefined) return null;
      return p.lengthIn * p.widthIn;
    case "bundtTube":
    case "muffin":
      return null;
  }
};

export const panCapacityCups = (p: PanDimensions): number | null => {
  if (p.capacityCupsOverride !== undefined) return p.capacityCupsOverride;
  if (p.shape === "muffin") {
    if (p.cavities === undefined || p.cavityCapacityCups === undefined) {
      return null;
    }
    return p.cavities * p.cavityCapacityCups;
  }
  const area = panArea(p);
  if (area === null) return null;
  return (area * p.depthIn) / CUBIC_INCHES_PER_CUP;
};

export const cupsToMl = (cups: number): number => cups * 236.5882365;

export const inchesToCm = (inches: number): number => inches * 2.54;
export const cmToInches = (cm: number): number => cm / 2.54;
export const sqInToSqCm = (sqIn: number): number => sqIn * 6.4516;

export const computedDepthFromBatter = (
  batterCups: number,
  area: number | null,
): number | null => {
  if (area === null || area <= 0) return null;
  return (batterCups * CUBIC_INCHES_PER_CUP) / area;
};

export const PAN_PRESETS: PanPreset[] = [
  {
    key: "round6x2",
    shape: "round",
    diameterIn: 6,
    depthIn: 2,
  },
  {
    key: "round7x2",
    shape: "round",
    diameterIn: 7,
    depthIn: 2,
  },
  {
    key: "round8x2",
    shape: "round",
    diameterIn: 8,
    depthIn: 2,
  },
  {
    key: "round9x2",
    shape: "round",
    diameterIn: 9,
    depthIn: 2,
  },
  {
    key: "round10x2",
    shape: "round",
    diameterIn: 10,
    depthIn: 2,
  },
  {
    key: "round12x2",
    shape: "round",
    diameterIn: 12,
    depthIn: 2,
  },
  {
    key: "pie9x1_5",
    shape: "round",
    diameterIn: 9,
    depthIn: 1.5,
  },
  {
    key: "pie9x2DeepDish",
    shape: "round",
    diameterIn: 9.5,
    depthIn: 2,
  },

  {
    key: "square6x6",
    shape: "square",
    lengthIn: 6,
    depthIn: 2,
  },
  {
    key: "square8x8",
    shape: "square",
    lengthIn: 8,
    depthIn: 2,
  },
  {
    key: "square9x9",
    shape: "square",
    lengthIn: 9,
    depthIn: 2,
  },
  {
    key: "square10x10",
    shape: "square",
    lengthIn: 10,
    depthIn: 2,
  },

  {
    key: "rect7x11",
    shape: "rectangular",
    lengthIn: 11,
    widthIn: 7,
    depthIn: 2,
  },
  {
    key: "rect9x13",
    shape: "rectangular",
    lengthIn: 13,
    widthIn: 9,
    depthIn: 2,
  },
  {
    key: "rect10x15",
    shape: "rectangular",
    lengthIn: 15,
    widthIn: 10,
    depthIn: 2,
  },

  {
    key: "loafMini",
    shape: "loaf",
    lengthIn: 5.75,
    widthIn: 3.25,
    depthIn: 2.25,
  },
  {
    key: "loaf8x4",
    shape: "loaf",
    lengthIn: 8,
    widthIn: 4,
    depthIn: 2.5,
  },
  {
    key: "loaf85x45",
    shape: "loaf",
    lengthIn: 8.5,
    widthIn: 4.5,
    depthIn: 2.5,
  },
  {
    key: "loaf9x5",
    shape: "loaf",
    lengthIn: 9,
    widthIn: 5,
    depthIn: 3,
  },

  {
    key: "springform7",
    shape: "springform",
    diameterIn: 7,
    depthIn: 3,
  },
  {
    key: "springform8",
    shape: "springform",
    diameterIn: 8,
    depthIn: 3,
  },
  {
    key: "springform9",
    shape: "springform",
    diameterIn: 9,
    depthIn: 3,
  },
  {
    key: "springform10",
    shape: "springform",
    diameterIn: 10,
    depthIn: 3,
  },

  {
    key: "quarterSheet",
    shape: "sheet",
    lengthIn: 13,
    widthIn: 9,
    depthIn: 1,
  },
  {
    key: "halfSheet",
    shape: "sheet",
    lengthIn: 18,
    widthIn: 13,
    depthIn: 1,
  },
  {
    key: "fullSheet",
    shape: "sheet",
    lengthIn: 26,
    widthIn: 18,
    depthIn: 1,
  },
  {
    key: "jellyRoll10x15",
    shape: "sheet",
    lengthIn: 15,
    widthIn: 10,
    depthIn: 1,
  },
  {
    key: "jellyRoll12x17",
    shape: "sheet",
    lengthIn: 17,
    widthIn: 12,
    depthIn: 1,
  },

  {
    key: "bundt6cup",
    shape: "bundtTube",
    depthIn: 3,
    capacityCupsOverride: 6,
  },
  {
    key: "bundt9cup",
    shape: "bundtTube",
    depthIn: 3,
    capacityCupsOverride: 9,
  },
  {
    key: "bundt10cup",
    shape: "bundtTube",
    depthIn: 3.5,
    capacityCupsOverride: 10,
  },
  {
    key: "bundt12cup",
    shape: "bundtTube",
    depthIn: 3.5,
    capacityCupsOverride: 12,
  },
  {
    key: "bundt15cup",
    shape: "bundtTube",
    depthIn: 4,
    capacityCupsOverride: 15,
  },
  {
    key: "tube9",
    shape: "bundtTube",
    depthIn: 4,
    capacityCupsOverride: 12,
  },
  {
    key: "tube10",
    shape: "bundtTube",
    depthIn: 4,
    capacityCupsOverride: 16,
  },

  {
    key: "muffinMini24",
    shape: "muffin",
    depthIn: 0.75,
    cavities: 24,
    cavityCapacityCups: 0.125,
  },
  {
    key: "muffinStandard6",
    shape: "muffin",
    depthIn: 1.25,
    cavities: 6,
    cavityCapacityCups: 0.5,
  },
  {
    key: "muffinStandard12",
    shape: "muffin",
    depthIn: 1.25,
    cavities: 12,
    cavityCapacityCups: 0.5,
  },
  {
    key: "muffinJumbo6",
    shape: "muffin",
    depthIn: 1.75,
    cavities: 6,
    cavityCapacityCups: 1,
  },
];

export const PRESETS_BY_SHAPE: Record<PanShape, PanPreset[]> = {
  round: PAN_PRESETS.filter((p) => p.shape === "round"),
  square: PAN_PRESETS.filter((p) => p.shape === "square"),
  rectangular: PAN_PRESETS.filter((p) => p.shape === "rectangular"),
  loaf: PAN_PRESETS.filter((p) => p.shape === "loaf"),
  springform: PAN_PRESETS.filter((p) => p.shape === "springform"),
  sheet: PAN_PRESETS.filter((p) => p.shape === "sheet"),
  bundtTube: PAN_PRESETS.filter((p) => p.shape === "bundtTube"),
  muffin: PAN_PRESETS.filter((p) => p.shape === "muffin"),
};

export interface ScalingResult {
  multiplier: number;
  basis: "area" | "capacity";
  fromArea: number | null;
  toArea: number | null;
  fromCapacityCups: number | null;
  toCapacityCups: number | null;
}

export const computeScaling = (
  from: PanDimensions,
  to: PanDimensions,
): ScalingResult | null => {
  const fromArea = panArea(from);
  const toArea = panArea(to);
  const fromCap = panCapacityCups(from);
  const toCap = panCapacityCups(to);

  if (
    fromArea !== null &&
    toArea !== null &&
    isFlatBottom(from.shape) &&
    isFlatBottom(to.shape) &&
    fromArea > 0
  ) {
    return {
      multiplier: toArea / fromArea,
      basis: "area",
      fromArea,
      toArea,
      fromCapacityCups: fromCap,
      toCapacityCups: toCap,
    };
  }

  if (fromCap !== null && toCap !== null && fromCap > 0) {
    return {
      multiplier: toCap / fromCap,
      basis: "capacity",
      fromArea,
      toArea,
      fromCapacityCups: fromCap,
      toCapacityCups: toCap,
    };
  }

  return null;
};

export interface DepthAdvisory {
  newBatterDepthIn: number | null;
  fromBatterDepthIn: number | null;
  depthRatio: number | null;
}

export const computeDepthAdvisory = (
  from: PanDimensions,
  to: PanDimensions,
  multiplier: number,
  originalBatterCups: number | null,
): DepthAdvisory => {
  if (!isFlatBottom(from.shape) || !isFlatBottom(to.shape)) {
    return {
      newBatterDepthIn: null,
      fromBatterDepthIn: null,
      depthRatio: null,
    };
  }

  const fromArea = panArea(from);
  const toArea = panArea(to);
  if (fromArea === null || toArea === null || fromArea <= 0 || toArea <= 0) {
    return {
      newBatterDepthIn: null,
      fromBatterDepthIn: null,
      depthRatio: null,
    };
  }

  if (originalBatterCups !== null && originalBatterCups > 0) {
    const fromDepth = computedDepthFromBatter(originalBatterCups, fromArea);
    const toDepth = computedDepthFromBatter(
      originalBatterCups * multiplier,
      toArea,
    );
    if (fromDepth === null || toDepth === null) {
      return {
        newBatterDepthIn: null,
        fromBatterDepthIn: null,
        depthRatio: null,
      };
    }
    return {
      fromBatterDepthIn: fromDepth,
      newBatterDepthIn: toDepth,
      depthRatio: toDepth / fromDepth,
    };
  }

  const fromDepth = from.depthIn * (2 / 3);
  const toDepth = (fromDepth * fromArea * multiplier) / toArea;
  return {
    fromBatterDepthIn: fromDepth,
    newBatterDepthIn: toDepth,
    depthRatio: toDepth / fromDepth,
  };
};

export interface CapacityWarning {
  panCapacityCups: number;
  scaledBatterCups: number;
  maxRecommendedCups: number;
  overflowing: boolean;
}

export const computeCapacityWarning = (
  to: PanDimensions,
  scaledBatterCups: number,
): CapacityWarning | null => {
  const capacity = panCapacityCups(to);
  if (capacity === null) return null;
  const maxRecommended = capacity * (2 / 3);
  return {
    panCapacityCups: capacity,
    scaledBatterCups,
    maxRecommendedCups: maxRecommended,
    overflowing: scaledBatterCups > maxRecommended,
  };
};

export type BakeTimeDirection = "shallower" | "deeper" | "similar";

export interface BakeTimeAdvice {
  direction: BakeTimeDirection;
  suggestedTempDeltaF: number;
  estimatedTimeMultiplier: number;
}

export const computeBakeTimeAdvice = (
  from: PanDimensions,
  to: PanDimensions,
  multiplier: number,
): BakeTimeAdvice => {
  let depthRatio: number;

  if (isFlatBottom(from.shape) && isFlatBottom(to.shape)) {
    const fromArea = panArea(from);
    const toArea = panArea(to);
    if (fromArea !== null && toArea !== null && fromArea > 0 && toArea > 0) {
      const fromBatter = from.depthIn * (2 / 3);
      const toBatter = (fromBatter * fromArea * multiplier) / toArea;
      depthRatio = toBatter / fromBatter;
    } else {
      depthRatio = to.depthIn / from.depthIn;
    }
  } else {
    depthRatio = to.depthIn / from.depthIn;
  }

  let direction: BakeTimeDirection = "similar";
  if (depthRatio < 0.85) direction = "shallower";
  else if (depthRatio > 1.15) direction = "deeper";

  let suggestedTempDeltaF = 0;
  if (depthRatio < 0.7) suggestedTempDeltaF = 25;
  else if (depthRatio > 1.4) suggestedTempDeltaF = -25;

  return {
    direction,
    suggestedTempDeltaF,
    estimatedTimeMultiplier: Math.sqrt(depthRatio),
  };
};

export const findSimilarPresets = (
  target: PanDimensions,
  excludeKey: string | null,
  tolerance = 0.1,
): PanPreset[] => {
  const targetCap = panCapacityCups(target);
  if (targetCap === null) return [];

  return PAN_PRESETS.filter((preset) => {
    if (preset.key === excludeKey) return false;
    const cap = panCapacityCups(preset);
    if (cap === null) return false;
    const delta = Math.abs(cap - targetCap) / targetCap;
    return delta <= tolerance;
  })
    .sort((a, b) => {
      const ac = panCapacityCups(a) ?? 0;
      const bc = panCapacityCups(b) ?? 0;
      return Math.abs(ac - targetCap) - Math.abs(bc - targetCap);
    })
    .slice(0, 6);
};

export const formatCups = (cups: number): string => {
  if (!Number.isFinite(cups)) return "";
  if (cups >= 10) return cups.toFixed(0);
  if (cups >= 1) return cups.toFixed(1);
  return cups.toFixed(2);
};

export const formatInches = (inches: number): string => {
  if (!Number.isFinite(inches)) return "";
  if (Math.abs(inches - Math.round(inches)) < 0.05) {
    return String(Math.round(inches));
  }
  return inches.toFixed(1);
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
