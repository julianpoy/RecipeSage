import FractionJS from "fraction.js";
import {
  INGREDIENT_DENSITIES,
  REFERENCE_VOLUME_ML,
  type IngredientCategory,
  type IngredientDensity,
} from "./ingredientDensities";

export type VolumeUnit =
  | "cup"
  | "tablespoon"
  | "teaspoon"
  | "fluidOunce"
  | "milliliter"
  | "liter"
  | "pint"
  | "quart"
  | "gallon"
  | "deciliter"
  | "centiliter"
  | "imperialCup"
  | "imperialPint"
  | "imperialFluidOunce";

export type WeightUnit =
  | "gram"
  | "kilogram"
  | "ounce"
  | "pound"
  | "milligram"
  | "stone";

export const VOLUME_UNITS_COMMON: VolumeUnit[] = [
  "cup",
  "tablespoon",
  "teaspoon",
  "fluidOunce",
  "milliliter",
  "liter",
];

export const VOLUME_UNITS_EXTRA: VolumeUnit[] = [
  "pint",
  "quart",
  "gallon",
  "deciliter",
  "centiliter",
  "imperialCup",
  "imperialPint",
  "imperialFluidOunce",
];

export const VOLUME_UNITS: VolumeUnit[] = [
  ...VOLUME_UNITS_COMMON,
  ...VOLUME_UNITS_EXTRA,
];

export const WEIGHT_UNITS_COMMON: WeightUnit[] = [
  "gram",
  "kilogram",
  "ounce",
  "pound",
];

export const WEIGHT_UNITS_EXTRA: WeightUnit[] = ["milligram", "stone"];

export const WEIGHT_UNITS: WeightUnit[] = [
  ...WEIGHT_UNITS_COMMON,
  ...WEIGHT_UNITS_EXTRA,
];

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  "flours",
  "sugars",
  "dairyEggs",
  "fatsOils",
  "nutsSeeds",
  "fruits",
  "vegetables",
  "chocolate",
  "grains",
  "liquids",
  "leavenersSalt",
  "spreads",
  "other",
];

const VOLUME_TO_ML: Record<VolumeUnit, number> = {
  cup: 236.5882365,
  tablespoon: 14.786764781,
  teaspoon: 4.928921594,
  fluidOunce: 29.573529563,
  milliliter: 1,
  liter: 1000,
  pint: 473.176473,
  quart: 946.352946,
  gallon: 3785.411784,
  deciliter: 100,
  centiliter: 10,
  imperialCup: 284.130625,
  imperialPint: 568.26125,
  imperialFluidOunce: 28.4130625,
};

const WEIGHT_TO_GRAM: Record<WeightUnit, number> = {
  gram: 1,
  kilogram: 1000,
  ounce: 28.349523125,
  pound: 453.59237,
  milligram: 0.001,
  stone: 6350.29318,
};

export const isVolumeUnit = (unit: string): unit is VolumeUnit =>
  VOLUME_UNITS.some((candidate) => candidate === unit);

export const isWeightUnit = (unit: string): unit is WeightUnit =>
  WEIGHT_UNITS.some((candidate) => candidate === unit);

export const convertVolume = (
  value: number,
  from: VolumeUnit,
  to: VolumeUnit,
): number => (value * VOLUME_TO_ML[from]) / VOLUME_TO_ML[to];

export const convertWeight = (
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number => (value * WEIGHT_TO_GRAM[from]) / WEIGHT_TO_GRAM[to];

export const getIngredientGramsPerMl = (
  ingredient: IngredientDensity,
): number => ingredient.grams / REFERENCE_VOLUME_ML[ingredient.reference];

export const getIngredientByKey = (
  key: string,
): IngredientDensity | undefined =>
  INGREDIENT_DENSITIES.find((ingredient) => ingredient.key === key);

export const volumeToWeight = (
  value: number,
  fromVolumeUnit: VolumeUnit,
  toWeightUnit: WeightUnit,
  gramsPerMl: number,
): number => {
  const grams = value * VOLUME_TO_ML[fromVolumeUnit] * gramsPerMl;
  return grams / WEIGHT_TO_GRAM[toWeightUnit];
};

export const weightToVolume = (
  value: number,
  fromWeightUnit: WeightUnit,
  toVolumeUnit: VolumeUnit,
  gramsPerMl: number,
): number => {
  const ml = (value * WEIGHT_TO_GRAM[fromWeightUnit]) / gramsPerMl;
  return ml / VOLUME_TO_ML[toVolumeUnit];
};

const mapVolumes = (
  fn: (unit: VolumeUnit) => number,
): Record<VolumeUnit, number> => ({
  cup: fn("cup"),
  tablespoon: fn("tablespoon"),
  teaspoon: fn("teaspoon"),
  fluidOunce: fn("fluidOunce"),
  milliliter: fn("milliliter"),
  liter: fn("liter"),
  pint: fn("pint"),
  quart: fn("quart"),
  gallon: fn("gallon"),
  deciliter: fn("deciliter"),
  centiliter: fn("centiliter"),
  imperialCup: fn("imperialCup"),
  imperialPint: fn("imperialPint"),
  imperialFluidOunce: fn("imperialFluidOunce"),
});

const mapWeights = (
  fn: (unit: WeightUnit) => number,
): Record<WeightUnit, number> => ({
  gram: fn("gram"),
  kilogram: fn("kilogram"),
  ounce: fn("ounce"),
  pound: fn("pound"),
  milligram: fn("milligram"),
  stone: fn("stone"),
});

export interface ConversionPanel {
  volumes: Record<VolumeUnit, number> | null;
  weights: Record<WeightUnit, number> | null;
}

export const buildPanel = (
  value: number,
  unit: VolumeUnit | WeightUnit,
  gramsPerMl: number | null,
): ConversionPanel => {
  if (isVolumeUnit(unit)) {
    return {
      volumes: mapVolumes((to) => convertVolume(value, unit, to)),
      weights:
        gramsPerMl === null
          ? null
          : mapWeights((to) => volumeToWeight(value, unit, to, gramsPerMl)),
    };
  }

  return {
    weights: mapWeights((to) => convertWeight(value, unit, to)),
    volumes:
      gramsPerMl === null
        ? null
        : mapVolumes((to) => weightToVolume(value, unit, to, gramsPerMl)),
  };
};

export const celsiusToFahrenheit = (celsius: number): number =>
  (celsius * 9) / 5 + 32;

export const fahrenheitToCelsius = (fahrenheit: number): number =>
  ((fahrenheit - 32) * 5) / 9;

export const GAS_MARK_MIN = 1;
export const GAS_MARK_MAX = 9;

export const gasMarkToFahrenheit = (mark: number): number =>
  275 + (mark - 1) * 25;

export const fahrenheitToGasMark = (fahrenheit: number): number => {
  const raw = (fahrenheit - 275) / 25 + 1;
  return Math.min(GAS_MARK_MAX, Math.max(GAS_MARK_MIN, Math.round(raw)));
};

export interface OvenTemperature {
  gasMark: number;
  fahrenheit: number;
  celsius: number;
}

export const OVEN_TEMPERATURES: OvenTemperature[] = (() => {
  const temperatures: OvenTemperature[] = [];
  for (let mark = GAS_MARK_MIN; mark <= GAS_MARK_MAX; mark++) {
    const fahrenheit = gasMarkToFahrenheit(mark);
    temperatures.push({
      gasMark: mark,
      fahrenheit,
      celsius: Math.round(fahrenheitToCelsius(fahrenheit)),
    });
  }
  return temperatures;
})();

export const parseQuantity = (input: string, locale: string): number | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    const decimalSep = parts.find((p) => p.type === "decimal")?.value ?? ".";
    const groupSep = parts.find((p) => p.type === "group")?.value ?? "";

    let normalized = trimmed;
    for (let i = 0; i < 10; i++) {
      const localizedDigit = i.toLocaleString(locale);
      if (localizedDigit !== String(i)) {
        normalized = normalized.split(localizedDigit).join(String(i));
      }
    }

    const hasDecimal = decimalSep !== "" && normalized.includes(decimalSep);
    const hasGroup = groupSep !== "" && normalized.includes(groupSep);

    if (hasDecimal && hasGroup) {
      normalized = normalized.split(groupSep).join("");
      normalized = normalized.split(decimalSep).join(".");
    } else if (hasDecimal) {
      normalized = normalized.split(decimalSep).join(".");
    } else if (hasGroup) {
      const groupParts = normalized.split(groupSep);
      const isThousandsGrouping = groupParts
        .slice(1)
        .every((p) => p.length === 3);
      if (isThousandsGrouping) {
        normalized = groupParts.join("");
      }
    }

    const value = new FractionJS(normalized).valueOf();
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

const FRACTION_DENOMINATOR = 16;

export const formatFraction = (value: number, locale: string): string => {
  if (!Number.isFinite(value)) return "";
  const snapped =
    Math.round(value * FRACTION_DENOMINATOR) / FRACTION_DENOMINATOR;
  if (snapped === 0 && value !== 0) return formatDecimal(value, locale);
  return new FractionJS(snapped).toFraction(true);
};

export const formatDecimal = (value: number, locale: string): string => {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  let digits: number;
  if (abs === 0) digits = 0;
  else if (abs < 1) digits = 3;
  else if (abs < 10) digits = 2;
  else if (abs < 100) digits = 1;
  else digits = 0;
  return value.toLocaleString(locale, {
    maximumFractionDigits: digits,
    useGrouping: false,
  });
};
