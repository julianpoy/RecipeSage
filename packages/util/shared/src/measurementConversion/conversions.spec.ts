import { describe, it, expect } from "vitest";
import {
  INGREDIENT_DENSITIES,
  COUNT_ITEMS,
  REFERENCE_VOLUME_ML,
} from "./ingredientDensities";
import {
  VOLUME_UNITS,
  WEIGHT_UNITS,
  INGREDIENT_CATEGORIES,
  convertVolume,
  convertWeight,
  volumeToWeight,
  weightToVolume,
  getIngredientByKey,
  getIngredientGramsPerMl,
  buildPanel,
  isVolumeUnit,
  isWeightUnit,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  gasMarkToFahrenheit,
  fahrenheitToGasMark,
  OVEN_TEMPERATURES,
  formatFraction,
  formatDecimal,
  parseQuantity,
} from "./conversions";

describe("measurement conversions", () => {
  describe("convertVolume", () => {
    it("converts a cup into smaller volume units", () => {
      expect(convertVolume(1, "cup", "tablespoon")).toBeCloseTo(16, 6);
      expect(convertVolume(1, "cup", "teaspoon")).toBeCloseTo(48, 6);
      expect(convertVolume(1, "cup", "fluidOunce")).toBeCloseTo(8, 6);
      expect(convertVolume(1, "cup", "milliliter")).toBeCloseTo(236.588, 3);
    });

    it("converts metric volumes", () => {
      expect(convertVolume(1, "liter", "milliliter")).toBeCloseTo(1000, 6);
      expect(convertVolume(1, "deciliter", "milliliter")).toBeCloseTo(100, 6);
      expect(convertVolume(1, "centiliter", "milliliter")).toBeCloseTo(10, 6);
    });

    it("converts US gallon family", () => {
      expect(convertVolume(1, "gallon", "quart")).toBeCloseTo(4, 6);
      expect(convertVolume(1, "quart", "pint")).toBeCloseTo(2, 6);
      expect(convertVolume(1, "pint", "cup")).toBeCloseTo(2, 6);
      expect(convertVolume(1, "gallon", "cup")).toBeCloseTo(16, 6);
    });

    it("converts imperial volumes", () => {
      expect(
        convertVolume(1, "imperialPint", "imperialFluidOunce"),
      ).toBeCloseTo(20, 6);
      expect(convertVolume(1, "imperialCup", "milliliter")).toBeCloseTo(
        284.130625,
        6,
      );
      expect(convertVolume(2, "imperialCup", "imperialPint")).toBeCloseTo(1, 6);
    });

    it("is reversible", () => {
      const there = convertVolume(2.5, "cup", "milliliter");
      expect(convertVolume(there, "milliliter", "cup")).toBeCloseTo(2.5, 9);
    });
  });

  describe("convertWeight", () => {
    it("converts pounds and ounces", () => {
      expect(convertWeight(1, "pound", "ounce")).toBeCloseTo(16, 6);
      expect(convertWeight(1, "pound", "gram")).toBeCloseTo(453.592, 3);
      expect(convertWeight(1, "ounce", "gram")).toBeCloseTo(28.3495, 4);
    });

    it("converts kilograms", () => {
      expect(convertWeight(1, "kilogram", "gram")).toBeCloseTo(1000, 6);
    });

    it("converts milligrams and stones", () => {
      expect(convertWeight(1000, "milligram", "gram")).toBeCloseTo(1, 6);
      expect(convertWeight(1, "stone", "pound")).toBeCloseTo(14, 6);
      expect(convertWeight(1, "stone", "kilogram")).toBeCloseTo(6.35029318, 6);
    });
  });

  describe("unit guards", () => {
    it("recognises volume and weight units", () => {
      expect(isVolumeUnit("cup")).toBe(true);
      expect(isVolumeUnit("gram")).toBe(false);
      expect(isWeightUnit("gram")).toBe(true);
      expect(isWeightUnit("cup")).toBe(false);
    });
  });

  describe("ingredient density bridge", () => {
    it("reproduces cup weights", () => {
      const flour = getIngredientByKey("allPurposeFlour");
      const sugar = getIngredientByKey("granulatedSugar");
      const water = getIngredientByKey("water");
      expect(flour).toBeDefined();
      expect(sugar).toBeDefined();
      expect(water).toBeDefined();
      if (!flour || !sugar || !water) return;

      expect(
        volumeToWeight(1, "cup", "gram", getIngredientGramsPerMl(flour)),
      ).toBeCloseTo(120, 1);
      expect(
        volumeToWeight(1, "cup", "gram", getIngredientGramsPerMl(sugar)),
      ).toBeCloseTo(198, 1);
      expect(
        volumeToWeight(1, "cup", "gram", getIngredientGramsPerMl(water)),
      ).toBeCloseTo(237, 1);
    });

    it("handles ingredients referenced at fractional volumes", () => {
      const butter = getIngredientByKey("butter");
      expect(butter).toBeDefined();
      if (!butter) return;
      expect(
        volumeToWeight(0.5, "cup", "gram", getIngredientGramsPerMl(butter)),
      ).toBeCloseTo(113, 1);
    });

    it("round-trips weight back to volume", () => {
      const flour = getIngredientByKey("allPurposeFlour");
      if (!flour) return;
      const gramsPerMl = getIngredientGramsPerMl(flour);
      expect(weightToVolume(120, "gram", "cup", gramsPerMl)).toBeCloseTo(1, 1);
    });
  });

  describe("buildPanel", () => {
    it("fills volumes and weights from a volume input with density", () => {
      const flour = getIngredientByKey("allPurposeFlour");
      if (!flour) return;
      const panel = buildPanel(1, "cup", getIngredientGramsPerMl(flour));
      expect(panel.volumes?.tablespoon).toBeCloseTo(16, 6);
      expect(panel.weights?.gram).toBeCloseTo(120, 1);
    });

    it("omits weights when no density is supplied", () => {
      const panel = buildPanel(1, "cup", null);
      expect(panel.volumes?.milliliter).toBeCloseTo(236.588, 3);
      expect(panel.weights).toBeNull();
    });

    it("omits volumes when converting weight without density", () => {
      const panel = buildPanel(100, "gram", null);
      expect(panel.weights?.ounce).toBeCloseTo(3.5274, 3);
      expect(panel.volumes).toBeNull();
    });
  });

  describe("temperature", () => {
    it("converts between celsius and fahrenheit", () => {
      expect(celsiusToFahrenheit(0)).toBe(32);
      expect(celsiusToFahrenheit(100)).toBe(212);
      expect(fahrenheitToCelsius(32)).toBe(0);
      expect(fahrenheitToCelsius(350)).toBeCloseTo(176.667, 3);
    });

    it("maps gas marks", () => {
      expect(gasMarkToFahrenheit(1)).toBe(275);
      expect(gasMarkToFahrenheit(4)).toBe(350);
      expect(gasMarkToFahrenheit(9)).toBe(475);
      expect(fahrenheitToGasMark(350)).toBe(4);
      expect(fahrenheitToGasMark(100)).toBe(1);
      expect(fahrenheitToGasMark(900)).toBe(9);
    });

    it("exposes a complete oven reference table", () => {
      expect(OVEN_TEMPERATURES).toHaveLength(9);
      const gasFour = OVEN_TEMPERATURES.find((t) => t.gasMark === 4);
      expect(gasFour?.fahrenheit).toBe(350);
      expect(gasFour?.celsius).toBe(177);
    });
  });

  describe("formatting", () => {
    it("renders recipe-friendly fractions", () => {
      expect(formatFraction(0.25)).toBe("1/4");
      expect(formatFraction(1.5)).toBe("1 1/2");
      expect(formatFraction(2)).toBe("2");
    });

    it("falls back to decimal when a non-zero value snaps below 1/16", () => {
      expect(formatFraction(0.004)).toBe("0.004");
      expect(formatFraction(0)).toBe("0");
    });

    it("renders adaptive decimals", () => {
      expect(formatDecimal(236.588)).toBe("237");
      expect(formatDecimal(3.527)).toBe("3.53");
      expect(formatDecimal(0.262)).toBe("0.262");
    });

    it("parses decimals and fractions", () => {
      expect(parseQuantity("1.5")).toBeCloseTo(1.5, 9);
      expect(parseQuantity("1 1/2")).toBeCloseTo(1.5, 9);
      expect(parseQuantity("3/4")).toBeCloseTo(0.75, 9);
      expect(parseQuantity("")).toBeNull();
      expect(parseQuantity("abc")).toBeNull();
    });
  });

  describe("dataset integrity", () => {
    it("uses unique ingredient keys", () => {
      const keys = INGREDIENT_DENSITIES.map((ingredient) => ingredient.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("references known volumes and positive weights", () => {
      for (const ingredient of INGREDIENT_DENSITIES) {
        expect(REFERENCE_VOLUME_ML[ingredient.reference]).toBeGreaterThan(0);
        expect(ingredient.grams).toBeGreaterThan(0);
        expect(INGREDIENT_CATEGORIES).toContain(ingredient.category);
      }
    });

    it("uses unique count item keys with positive weights", () => {
      const keys = COUNT_ITEMS.map((item) => item.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const item of COUNT_ITEMS) {
        expect(item.gramsPerUnit).toBeGreaterThan(0);
      }
    });

    it("exposes every unit constant", () => {
      expect(VOLUME_UNITS).toContain("cup");
      expect(WEIGHT_UNITS).toContain("gram");
    });
  });
});
