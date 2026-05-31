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
      expect(formatFraction(0.25, "en-us")).toBe("1/4");
      expect(formatFraction(1.5, "en-us")).toBe("1 1/2");
      expect(formatFraction(2, "en-us")).toBe("2");
    });

    it("falls back to decimal when a non-zero value snaps below 1/16", () => {
      expect(formatFraction(0.004, "en-us")).toBe("0.004");
      expect(formatFraction(0, "en-us")).toBe("0");
    });

    it("renders adaptive decimals", () => {
      expect(formatDecimal(236.588, "en-us")).toBe("237");
      expect(formatDecimal(3.527, "en-us")).toBe("3.53");
      expect(formatDecimal(0.262, "en-us")).toBe("0.262");
    });

    it("parses decimals and fractions", () => {
      expect(parseQuantity("1.5", "en-us")).toBeCloseTo(1.5, 9);
      expect(parseQuantity("1 1/2", "en-us")).toBeCloseTo(1.5, 9);
      expect(parseQuantity("3/4", "en-us")).toBeCloseTo(0.75, 9);
      expect(parseQuantity("", "en-us")).toBeNull();
      expect(parseQuantity("abc", "en-us")).toBeNull();
    });

    describe("locale-aware formatting", () => {
      it("uses en-us when locale is explicitly en-us", () => {
        expect(formatDecimal(1.5, "en-us")).toBe("1.5");
        expect(formatDecimal(3.527, "en-us")).toBe("3.53");
      });

      it("uses comma decimal separator for de-de", () => {
        expect(formatDecimal(1.5, "de-de")).toBe("1,5");
        expect(formatDecimal(3.527, "de-de")).toBe("3,53");
      });

      it("uses comma decimal separator for fr-fr", () => {
        expect(formatDecimal(0.262, "fr-fr")).toBe("0,262");
      });

      it("suppresses grouping separators across locales", () => {
        expect(formatDecimal(1234, "de-de")).toBe("1234");
        expect(formatDecimal(1234, "en-us")).toBe("1234");
      });

      it("suppresses grouping for large numbers across locales", () => {
        expect(formatDecimal(12345, "de-de")).toBe("12345");
        expect(formatDecimal(12345, "en-us")).toBe("12345");
      });

      it("applies comma decimal for fractional values in de-de", () => {
        expect(formatDecimal(1.234, "de-de")).toBe("1,23");
      });

      it("renders integers identically across locales", () => {
        expect(formatDecimal(237, "de-de")).toBe("237");
        expect(formatDecimal(237, "en-us")).toBe("237");
      });

      it("rounds half-away-from-zero at the .x5 boundary", () => {
        expect(formatDecimal(3.525, "en-us")).toBe("3.53");
        expect(formatDecimal(3.525, "de-de")).toBe("3,53");
        expect(formatDecimal(2.675, "en-us")).toBe("2.68");
      });

      it("formatFraction passes locale through to its decimal fallback", () => {
        expect(formatFraction(0.004, "de-de")).toBe("0,004");
        expect(formatFraction(0.004, "en-us")).toBe("0.004");
      });

      it("formatFraction returns a fraction regardless of locale when snappable", () => {
        expect(formatFraction(1.5, "de-de")).toBe("1 1/2");
        expect(formatFraction(0.25, "fr-fr")).toBe("1/4");
      });
    });

    describe("locale-aware parsing", () => {
      it("accepts comma decimal in de-de", () => {
        expect(parseQuantity("1,5", "de-de")).toBeCloseTo(1.5, 9);
        expect(parseQuantity("0,75", "de-de")).toBeCloseTo(0.75, 9);
      });

      it("still accepts dot decimal in de-de when only one group of non-3 digits follows", () => {
        expect(parseQuantity("1.5", "de-de")).toBeCloseTo(1.5, 9);
      });

      it("treats dot as thousand separator in de-de when followed by 3 digits", () => {
        expect(parseQuantity("1.000", "de-de")).toBeCloseTo(1000, 9);
      });

      it("parses combined German thousand + decimal separators", () => {
        expect(parseQuantity("1.500,5", "de-de")).toBeCloseTo(1500.5, 9);
      });

      it("rejects comma decimal in en-us (locale strictness)", () => {
        expect(parseQuantity("1,5", "en-us")).toBeNull();
      });

      it("parses en-us thousand separator", () => {
        expect(parseQuantity("1,000", "en-us")).toBeCloseTo(1000, 9);
        expect(parseQuantity("1,000,000", "en-us")).toBeCloseTo(1000000, 9);
      });

      it("parses Arabic decimal separator in ar-sa with Latin digits", () => {
        expect(parseQuantity("1٫5", "ar-sa")).toBeCloseTo(1.5, 9);
      });

      it("parses Arabic-Indic digits in ar-sa", () => {
        expect(parseQuantity("١٫٥", "ar-sa")).toBeCloseTo(1.5, 9);
      });

      it("still accepts fractions in any locale", () => {
        expect(parseQuantity("3/4", "de-de")).toBeCloseTo(0.75, 9);
        expect(parseQuantity("1 1/2", "fr-fr")).toBeCloseTo(1.5, 9);
      });

      it("returns null for empty or non-numeric input in any locale", () => {
        expect(parseQuantity("", "de-de")).toBeNull();
        expect(parseQuantity("abc", "fr-fr")).toBeNull();
      });
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
