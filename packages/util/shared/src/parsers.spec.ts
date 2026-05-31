import { describe, it, expect } from "vitest";
import { System } from "unitz-ts";
import {
  getMeasurementsForIngredient,
  getSingleScalableMeasurement,
  getTitleForIngredient,
  stripIngredient,
  parseIngredients,
  parseInstructions,
  parseNotes,
  parseYieldCount,
  applyInlineFormatting,
  applyInlineFormattingWithImages,
  stripInlineFormatting,
  stripImageTokens,
  isRtlText,
} from "./parsers";

describe("parsers", () => {
  describe("getMeasurementsForIngredient", () => {
    describe("basic measurements", () => {
      it("extracts measurement with unit", () => {
        const result = getMeasurementsForIngredient("2 cups flour");
        expect(result).toEqual(["2 cups"]);
      });

      it("extracts measurement without unit", () => {
        const result = getMeasurementsForIngredient("3 eggs");
        expect(result).toEqual(["3"]);
      });

      it("returns empty array when no measurements found", () => {
        const result = getMeasurementsForIngredient("salt to taste");
        expect(result).toEqual([]);
      });
    });

    describe("multipart measurements", () => {
      it("extracts measurements separated by plus", () => {
        const result = getMeasurementsForIngredient(
          "1 cup + 2 tablespoons sugar",
        );
        expect(result).toEqual(["1 cup", "2 tablespoons"]);
      });

      it("extracts measurements separated by or", () => {
        const result = getMeasurementsForIngredient("1 cup or 250ml milk");
        expect(result).toEqual(["1 cup", "250ml"]);
      });

      it("extracts measurements separated by plus keyword", () => {
        const result = getMeasurementsForIngredient(
          "1 cup plus 2 tablespoons flour",
        );
        expect(result).toEqual(["1 cup", "2 tablespoons"]);
      });
    });

    describe("special formats", () => {
      it("handles unicode fractions", () => {
        const result = getMeasurementsForIngredient("½ cup milk");
        expect(result).toEqual(["1/2 cup"]);
      });

      it("handles range measurements", () => {
        const result = getMeasurementsForIngredient("1-2 teaspoons salt");
        expect(result).toEqual(["1-2 teaspoons"]);
      });

      it("handles range with to keyword", () => {
        const result = getMeasurementsForIngredient(
          "3 to 4 tablespoons butter",
        );
        expect(result).toEqual(["3 to 4 tablespoons"]);
      });

      it("strips notes in parentheses", () => {
        const result = getMeasurementsForIngredient("2 cups flour (sifted)");
        expect(result).toEqual(["2 cups"]);
      });
    });

    describe("non-English multipart connectors", () => {
      it("splits on German oder", () => {
        expect(getMeasurementsForIngredient("1 cup oder 250 ml Milch")).toEqual(
          ["1 cup", "250 ml"],
        );
      });

      it("splits on German und", () => {
        expect(
          getMeasurementsForIngredient("1 cup und 2 tablespoons sugar"),
        ).toEqual(["1 cup", "2 tablespoons"]);
      });
    });

    describe("dash range markers", () => {
      it("handles en-dash range", () => {
        const result = getMeasurementsForIngredient("1–2 cups flour");
        expect(result).toEqual(["1–2 cups"]);
      });

      it("handles em-dash range", () => {
        const result = getMeasurementsForIngredient("1—2 cups flour");
        expect(result).toEqual(["1—2 cups"]);
      });
    });

    describe("English false-positive guards", () => {
      it("does not split 'et al.' as a connector", () => {
        expect(getMeasurementsForIngredient("1 cup flour, et al.")).toEqual([
          "1 cup",
        ]);
      });

      it("does not split bare 'ou' as a connector", () => {
        expect(getMeasurementsForIngredient("1 cup ou autre")).toEqual([
          "1 cup",
        ]);
      });
    });
  });

  describe("getSingleScalableMeasurement", () => {
    it("returns qty + unit for a clean line", () => {
      expect(getSingleScalableMeasurement("2 cups flour")).toEqual({
        qtyText: "2",
        qtyValue: 2,
        unit: "cups",
      });
    });

    it("returns qty alone when no unit is present", () => {
      expect(getSingleScalableMeasurement("3 eggs")).toEqual({
        qtyText: "3",
        qtyValue: 3,
        unit: "",
      });
    });

    it("parses fractions and mixed numbers", () => {
      expect(getSingleScalableMeasurement("1/2 cup butter")).toEqual({
        qtyText: "1/2",
        qtyValue: 0.5,
        unit: "cup",
      });
      expect(getSingleScalableMeasurement("1 1/2 tsp salt")).toEqual({
        qtyText: "1 1/2",
        qtyValue: 1.5,
        unit: "tsp",
      });
    });

    it("returns null for headers", () => {
      expect(getSingleScalableMeasurement("[Sauce]")).toBeNull();
    });

    it("returns null for empty input", () => {
      expect(getSingleScalableMeasurement("")).toBeNull();
      expect(getSingleScalableMeasurement("   ")).toBeNull();
    });

    it("returns null for unquantified ingredients", () => {
      expect(getSingleScalableMeasurement("salt to taste")).toBeNull();
    });

    it("returns null for ranges", () => {
      expect(getSingleScalableMeasurement("1-2 tsp salt")).toBeNull();
      expect(getSingleScalableMeasurement("1 to 2 cups flour")).toBeNull();
      expect(getSingleScalableMeasurement("1 à 2 tasses de farine")).toBeNull();
      expect(getSingleScalableMeasurement("1 bis 2 Tassen Mehl")).toBeNull();
      expect(getSingleScalableMeasurement("1–2 cups flour")).toBeNull();
      expect(getSingleScalableMeasurement("1—2 cups flour")).toBeNull();
    });

    it("returns null for multipart measurements", () => {
      expect(
        getSingleScalableMeasurement("1 cup + 2 tablespoons sugar"),
      ).toBeNull();
      expect(getSingleScalableMeasurement("1 cup or 250ml milk")).toBeNull();
    });
  });

  describe("parseYieldCount", () => {
    it("returns null for null/undefined/empty", () => {
      expect(parseYieldCount(null)).toBeNull();
      expect(parseYieldCount(undefined)).toBeNull();
      expect(parseYieldCount("")).toBeNull();
      expect(parseYieldCount("   ")).toBeNull();
    });

    it("extracts the first integer from common yield text", () => {
      expect(parseYieldCount("4 servings")).toBe(4);
      expect(parseYieldCount("Serves 6")).toBe(6);
      expect(parseYieldCount("Makes 12 cookies")).toBe(12);
      expect(parseYieldCount("1 loaf")).toBe(1);
    });

    it("uses the lower bound of a range", () => {
      expect(parseYieldCount("Makes 8-10 cookies")).toBe(8);
      expect(parseYieldCount("4 to 6 servings")).toBe(4);
    });

    it("handles decimal yields", () => {
      expect(parseYieldCount("1.5 dozen")).toBe(1.5);
      expect(parseYieldCount("2,5 portions")).toBe(2.5);
    });

    it("returns null when there is no number", () => {
      expect(parseYieldCount("Two dozen cookies")).toBeNull();
      expect(parseYieldCount("Several servings")).toBeNull();
    });

    it("returns null for non-positive numbers", () => {
      expect(parseYieldCount("0 servings")).toBeNull();
    });

    it("ignores a leading minus and parses the magnitude", () => {
      expect(parseYieldCount("-3 servings")).toBe(3);
      expect(parseYieldCount("slice-2 servings")).toBe(2);
    });

    it("treats comma followed by exactly 3 digits as a thousand separator", () => {
      expect(parseYieldCount("1,000 cookies")).toBe(1000);
    });

    it("treats comma followed by non-3 digits as a decimal", () => {
      expect(parseYieldCount("1,5 dozen")).toBe(1.5);
    });
  });

  describe("getTitleForIngredient", () => {
    describe("measurement removal", () => {
      it("removes measurement but keeps descriptive text", () => {
        const result = getTitleForIngredient("3 cups chopped apples");
        expect(result).toBe("chopped apples");
      });

      it("handles ingredient with no measurements", () => {
        const result = getTitleForIngredient("fresh basil");
        expect(result).toBe("fresh basil");
      });
    });

    describe("multipart measurements", () => {
      it("removes empty parts and their delimiters", () => {
        const result = getTitleForIngredient("1 cup + 2 tablespoons flour");
        expect(result).toBe("flour");
      });

      it("removes empty parts with or delimiter", () => {
        const result = getTitleForIngredient("1 cup or 250ml milk");
        expect(result).toBe("milk");
      });

      it("preserves delimiter when both parts have ingredients", () => {
        const result = getTitleForIngredient(
          "1 cup apples + 2 tablespoons sugar",
        );
        expect(result).toBe("apples + sugar");
      });

      it("splits on German oder connector", () => {
        const result = getTitleForIngredient(
          "1 cup apples oder 2 tablespoons sugar",
        );
        expect(result).toBe("apples oder sugar");
      });

      it("splits on German und connector", () => {
        const result = getTitleForIngredient(
          "1 cup apples und 2 tablespoons sugar",
        );
        expect(result).toBe("apples und sugar");
      });
    });

    describe("notes handling", () => {
      it("removes parenthetical notes", () => {
        const result = getTitleForIngredient("2 cups apples (peeled)");
        expect(result).toBe("apples");
      });
    });
  });

  describe("stripIngredient", () => {
    describe("complete stripping", () => {
      it("removes measurements, units, and filler words", () => {
        const result = stripIngredient("3 cups chopped apples");
        expect(result).toBe("apples");
      });

      it("removes parenthetical notes", () => {
        const result = stripIngredient("2 apples (peeled)");
        expect(result).toBe("apples");
      });

      it("removes trailing commas", () => {
        const result = stripIngredient("2 cups flour,");
        expect(result).toBe("flour");
      });
    });

    describe("filler words", () => {
      it("removes filler words at start", () => {
        const result = stripIngredient("chopped onions");
        expect(result).toBe("onions");
      });

      it("removes filler words at end", () => {
        const result = stripIngredient("apples chopped");
        expect(result).toBe("apples");
      });

      it("removes multiple filler words", () => {
        const result = stripIngredient("2 cups chopped minced garlic");
        expect(result).toBe("garlic");
      });
    });

    describe("unicode fractions", () => {
      it("handles unicode fractions", () => {
        const result = stripIngredient("½ cup sugar");
        expect(result).toBe("sugar");
      });
    });
  });

  describe("parseIngredients", () => {
    describe("basic parsing", () => {
      it("parses single ingredient with scale 1", () => {
        const result = parseIngredients("2 cups flour", "1");
        expect(result).toHaveLength(1);
        expect(result[0].content).toBe("2 cups flour");
        expect(result[0].originalContent).toBe("2 cups flour");
        expect(result[0].isHeader).toBe(false);
        expect(result[0].complete).toBe(false);
      });

      it("returns empty array for empty input", () => {
        const result = parseIngredients("", "1");
        expect(result).toEqual([]);
      });

      it("parses multiple ingredients", () => {
        const result = parseIngredients(
          "2 cups flour\n3 eggs\n1 cup milk",
          "1",
        );
        expect(result).toHaveLength(3);
      });
    });

    describe("scaling", () => {
      it("scales measurements by factor of 2", () => {
        const result = parseIngredients("2 cups flour", "2");
        expect(result[0].content).toBe("4 cups flour");
      });

      it("scales fractional measurements", () => {
        const result = parseIngredients("1/2 cup sugar", "2");
        expect(result[0].content).toBe("1 cup sugar");
      });

      it("scales range measurements", () => {
        const result = parseIngredients("1-2 teaspoons salt", "2");
        expect(result[0].content).toBe("2-4 teaspoons salt");
      });

      it("scales unicode fractions", () => {
        const result = parseIngredients("½ cup butter", "2");
        expect(result[0].content).toBe("1 cup butter");
      });
    });

    describe("headers", () => {
      it("detects headers in brackets", () => {
        const result = parseIngredients("[Sauce]\n2 cups tomato", "1");
        expect(result[0].isHeader).toBe(true);
        expect(result[0].content).toBe("Sauce");
        expect(result[1].isHeader).toBe(false);
      });

      it("formats headers with bold tag in html", () => {
        const result = parseIngredients("[Topping]", "1");
        expect(result[0].htmlContent).toBe(
          '<b class="sectionHeader">Topping</b>',
        );
      });
    });

    describe("multipart measurements", () => {
      it("preserves plus delimiter", () => {
        const result = parseIngredients("1 cup + 2 tablespoons flour", "1");
        expect(result[0].content).toBe("1 cup + 2 tablespoons flour");
      });

      it("scales multipart measurements", () => {
        const result = parseIngredients("1 cup + 2 tablespoons flour", "2");
        expect(result[0].content).toBe("2 cup + 4 tablespoons flour");
      });
    });

    describe("line continuations", () => {
      it("converts escaped newlines to actual newlines but not independent steps", () => {
        const result = parseIngredients("2 cups flour\\\nall-purpose", "1");
        expect(result[0].content).toBe("2 cups flour\nall-purpose");
      });

      it("converts escaped newlines to br tags in html but not independent steps", () => {
        const result = parseIngredients("2 cups flour\\\nall-purpose", "1");
        expect(result[0].htmlContent).toContain("<br>");
      });
    });

    describe("html output", () => {
      it("wraps measurements in bold tags", () => {
        const result = parseIngredients("2 cups flour", "1");
        expect(result[0].htmlContent).toContain(
          '<b class="ingredientMeasurement">2</b>',
        );
      });
    });

    describe("rtl text", () => {
      it("detects rtl text", () => {
        const result = parseIngredients("2 كوب دقيق", "1");
        expect(result[0].isRtl).toBe(true);
      });

      it("detects ltr text", () => {
        const result = parseIngredients("2 cups flour", "1");
        expect(result[0].isRtl).toBe(false);
      });
    });

    describe("input format coverage", () => {
      describe("integers", () => {
        it("keeps integer at scale 1", () => {
          expect(parseIngredients("2 cups flour", "1")[0].content).toBe(
            "2 cups flour",
          );
        });
        it("scales integer by integer", () => {
          expect(parseIngredients("2 cups flour", "2")[0].content).toBe(
            "4 cups flour",
          );
        });
        it("scales integer by 1/2", () => {
          expect(parseIngredients("2 cups flour", "1/2")[0].content).toBe(
            "1 cups flour",
          );
        });
        it("keeps unit-less integer at scale 1", () => {
          expect(parseIngredients("3 eggs", "1")[0].content).toBe("3 eggs");
        });
        it("scales unit-less integer by 1/2", () => {
          expect(parseIngredients("3 eggs", "1/2")[0].content).toBe(
            "1 1/2 eggs",
          );
        });
        it("scales unit-less integer to whole", () => {
          expect(parseIngredients("3 eggs", "1/3")[0].content).toBe("1 eggs");
        });
      });

      describe("decimals", () => {
        it("preserves decimal at scale 1", () => {
          expect(parseIngredients("1.5 cups milk", "1")[0].content).toBe(
            "1.5 cups milk",
          );
        });
        it("scales decimal by integer", () => {
          expect(parseIngredients("1.5 cups milk", "2")[0].content).toBe(
            "3 cups milk",
          );
        });
        it("scales decimal by 1/3 to decimal, never a fraction", () => {
          expect(parseIngredients("1.5 cups milk", "1/3")[0].content).toBe(
            "0.5 cups milk",
          );
        });
        it("scales decimal to whole", () => {
          expect(parseIngredients("0.25 cup oil", "4")[0].content).toBe(
            "1 cup oil",
          );
        });
        it("preserves decimal when scaled result has weird denominator but terminates", () => {
          expect(parseIngredients("1.7 L water", "6")[0].content).toBe(
            "10.2 L water",
          );
        });
        it("preserves decimal for one-tenths", () => {
          expect(parseIngredients("0.1 cup oil", "7")[0].content).toBe(
            "0.7 cup oil",
          );
        });
        it("preserves decimal for tenths scaled to hundredths", () => {
          expect(parseIngredients("1.5 L water", "1.7")[0].content).toBe(
            "2.55 L water",
          );
        });
        it("rounds non-terminating decimal scaling to a decimal, never a fraction", () => {
          const result = parseIngredients("1.5 cups milk", "1/7")[0].content;
          expect(result).toBe("~0.214 cups milk");
        });
        it("does not mark decimal-in integer-out as approximate", () => {
          const result = parseIngredients("0.5 cups milk", "2")[0].content;
          expect(result).toBe("1 cups milk");
          expect(result).not.toContain("~");
        });
        it("rounds vanishingly small decimals to ~0 instead of leaking scientific notation", () => {
          expect(parseIngredients("0.0001 cup oil", "0.0001")[0].content).toBe(
            "~0 cup oil",
          );
        });
      });

      describe("simple fractions", () => {
        it("preserves fraction at scale 1", () => {
          expect(parseIngredients("1/2 cup sugar", "1")[0].content).toBe(
            "1/2 cup sugar",
          );
        });
        it("scales fraction by 2", () => {
          expect(parseIngredients("1/2 cup sugar", "2")[0].content).toBe(
            "1 cup sugar",
          );
        });
        it("scales 1/3 cup by 2 to 2/3", () => {
          expect(parseIngredients("1/3 cup sugar", "2")[0].content).toBe(
            "2/3 cup sugar",
          );
        });
        it("scales 3/4 down by 1/3", () => {
          expect(parseIngredients("3/4 cup sugar", "1/3")[0].content).toBe(
            "1/4 cup sugar",
          );
        });
      });

      describe("mixed fractions", () => {
        it("preserves mixed fraction at scale 1", () => {
          expect(parseIngredients("1 1/2 cups flour", "1")[0].content).toBe(
            "1 1/2 cups flour",
          );
        });
        it("scales mixed fraction by 2", () => {
          expect(parseIngredients("1 1/2 cups flour", "2")[0].content).toBe(
            "3 cups flour",
          );
        });
        it("scales mixed fraction down", () => {
          expect(parseIngredients("1 1/2 cups flour", "1/3")[0].content).toBe(
            "1/2 cups flour",
          );
        });
        it("scales mixed fraction to another mixed fraction", () => {
          expect(parseIngredients("2 1/4 teaspoons salt", "2")[0].content).toBe(
            "4 1/2 teaspoons salt",
          );
        });
      });

      describe("unicode fractions", () => {
        it("scales unicode fraction to whole", () => {
          expect(parseIngredients("½ cup butter", "2")[0].content).toBe(
            "1 cup butter",
          );
        });
        it("scales unicode thirds", () => {
          expect(parseIngredients("⅓ cup sugar", "2")[0].content).toBe(
            "2/3 cup sugar",
          );
        });
        it("scales unicode quarters down", () => {
          expect(parseIngredients("¾ cup flour", "1/3")[0].content).toBe(
            "1/4 cup flour",
          );
        });
        it("scales unicode in mixed position", () => {
          expect(parseIngredients("1 ½ cups milk", "2")[0].content).toBe(
            "3 cups milk",
          );
        });
      });

      describe("ranges", () => {
        it("preserves dash range at scale 1", () => {
          expect(parseIngredients("1-2 teaspoons salt", "1")[0].content).toBe(
            "1-2 teaspoons salt",
          );
        });
        it("scales dash range up", () => {
          expect(parseIngredients("1-2 teaspoons salt", "2")[0].content).toBe(
            "2-4 teaspoons salt",
          );
        });
        it("scales dash range down to fractions", () => {
          expect(parseIngredients("1-2 teaspoons salt", "1/2")[0].content).toBe(
            "1/2-1 teaspoons salt",
          );
        });
        it("preserves spaced-dash range delimiter", () => {
          expect(parseIngredients("1 - 2 cups milk", "2")[0].content).toBe(
            "2 - 4 cups milk",
          );
        });
        it("preserves 'to' range delimiter at scale 1", () => {
          expect(
            parseIngredients("3 to 4 tablespoons butter", "1")[0].content,
          ).toBe("3 to 4 tablespoons butter");
        });
        it("preserves 'to' range delimiter while scaling", () => {
          expect(
            parseIngredients("3 to 4 tablespoons butter", "2")[0].content,
          ).toBe("6 to 8 tablespoons butter");
        });
        it("scales fraction range to integer range", () => {
          expect(parseIngredients("1/2 to 1 cup water", "2")[0].content).toBe(
            "1 to 2 cup water",
          );
        });
        it("scales mixed-fraction range", () => {
          expect(parseIngredients("1 1/2 - 2 cups flour", "2")[0].content).toBe(
            "3 - 4 cups flour",
          );
        });
        it("scales decimal range", () => {
          expect(parseIngredients("0.5-1 cup cream", "2")[0].content).toBe(
            "1-2 cup cream",
          );
        });
        it("preserves en-dash range delimiter while scaling", () => {
          expect(parseIngredients("1–2 cups flour", "2")[0].content).toBe(
            "2–4 cups flour",
          );
        });
        it("preserves em-dash range delimiter while scaling", () => {
          expect(parseIngredients("1—2 cups flour", "2")[0].content).toBe(
            "2—4 cups flour",
          );
        });
      });

      describe("multipart", () => {
        it("preserves plus delimiter at scale 1", () => {
          expect(
            parseIngredients("1 cup + 2 tablespoons flour", "1")[0].content,
          ).toBe("1 cup + 2 tablespoons flour");
        });
        it("scales each side of plus delimiter", () => {
          expect(
            parseIngredients("1 cup + 2 tablespoons flour", "2")[0].content,
          ).toBe("2 cup + 4 tablespoons flour");
        });
        it("preserves 'plus' word delimiter", () => {
          expect(
            parseIngredients("1 cup plus 2 tablespoons flour", "2")[0].content,
          ).toBe("2 cup plus 4 tablespoons flour");
        });
        it("preserves 'or' delimiter", () => {
          expect(parseIngredients("1 cup or 250ml milk", "2")[0].content).toBe(
            "2 cup or 500ml milk",
          );
        });
        it("scales fractional multipart", () => {
          expect(
            parseIngredients("1/2 cup + 1 tablespoon butter", "2")[0].content,
          ).toBe("1 cup + 2 tablespoon butter");
        });
        it("scales range within multipart", () => {
          expect(
            parseIngredients("1-2 cups + 1 tablespoon water", "2")[0].content,
          ).toBe("2-4 cups + 2 tablespoon water");
        });
        it("scales decimal multipart, preserving decimal notation per part", () => {
          expect(
            parseIngredients("1 cup + 0.5 tablespoon butter", "2")[0].content,
          ).toBe("2 cup + 1 tablespoon butter");
        });
        it("preserves German 'oder' connector while scaling", () => {
          expect(
            parseIngredients("1 cup oder 250 ml Milch", "2")[0].content,
          ).toBe("2 cup oder 500 ml Milch");
        });
        it("preserves German 'und' connector while scaling", () => {
          expect(
            parseIngredients("1 cup und 2 tablespoons sugar", "2")[0].content,
          ).toBe("2 cup und 4 tablespoons sugar");
        });
      });

      describe("parenthesised notes", () => {
        it("scales while preserving trailing note", () => {
          expect(
            parseIngredients("2 cups flour (sifted)", "2")[0].content,
          ).toBe("4 cups flour (sifted)");
        });
        it("scales while preserving inline note", () => {
          expect(
            parseIngredients("1 cup (packed) brown sugar", "2")[0].content,
          ).toBe("2 cup (packed) brown sugar");
        });
        it("scales fraction while preserving note", () => {
          expect(
            parseIngredients("1/2 cup water (boiling)", "2")[0].content,
          ).toBe("1 cup water (boiling)");
        });
      });

      describe("unit variations", () => {
        it("preserves abbreviated unit", () => {
          expect(parseIngredients("1 tbsp oil", "2")[0].content).toBe(
            "2 tbsp oil",
          );
        });
        it("preserves abbreviation with period", () => {
          expect(parseIngredients("1 tbs. oil", "2")[0].content).toBe(
            "2 tbs. oil",
          );
        });
        it("preserves swedish teaspoon alias", () => {
          expect(parseIngredients("1 tsk salt", "2")[0].content).toBe(
            "2 tsk salt",
          );
        });
        it("resolves teaspoon fully despite tea prefix alternation", () => {
          expect(parseIngredients("1 teaspoon salt", "2")[0].content).toBe(
            "2 teaspoon salt",
          );
        });
      });

      describe("headers are untouched", () => {
        it("does not scale bracketed header content", () => {
          const result = parseIngredients("[Sauce]\n2 cups tomato", "2");
          expect(result).toHaveLength(2);
          expect(result[0].isHeader).toBe(true);
          expect(result[0].content).toBe("Sauce");
          expect(result[1].content).toBe("4 cups tomato");
        });
      });
    });

    describe("scale as exact fraction string", () => {
      it("scales 120 g by '2/3' to exactly 80 g without unit downgrade", () => {
        expect(parseIngredients("120 g bread flour", "2/3")[0].content).toBe(
          "80 g bread flour",
        );
      });
      it("scales by string decimals", () => {
        expect(parseIngredients("100 g flour", "1.5")[0].content).toBe(
          "150 g flour",
        );
      });
      it("scales by string mixed fractions", () => {
        expect(parseIngredients("2 cups flour", "1 1/2")[0].content).toBe(
          "3 cups flour",
        );
      });
      it("scales by '1' string as identity", () => {
        expect(parseIngredients("1.5 cups milk", "1")[0].content).toBe(
          "1.5 cups milk",
        );
      });
    });

    describe("clean-denominator scaling", () => {
      it("outputs 1/3 cup for 1 cup × 1/3", () => {
        expect(parseIngredients("1 cup sugar", "1/3")[0].content).toBe(
          "1/3 cup sugar",
        );
      });
      it("outputs 1/4 cup for 1 cup × 1/4", () => {
        expect(parseIngredients("1 cup sugar", "1/4")[0].content).toBe(
          "1/4 cup sugar",
        );
      });
      it("outputs 1/2 cup for 1 cup × 1/2", () => {
        expect(parseIngredients("1 cup sugar", "1/2")[0].content).toBe(
          "1/2 cup sugar",
        );
      });
      it("outputs 1/8 cup for 1 cup × 1/8", () => {
        expect(parseIngredients("1 cup sugar", "1/8")[0].content).toBe(
          "1/8 cup sugar",
        );
      });
      it("outputs 3/4 cup for 1 cup × 3/4", () => {
        expect(parseIngredients("1 cup sugar", "3/4")[0].content).toBe(
          "3/4 cup sugar",
        );
      });
      it("outputs integer for integer-ish float scale", () => {
        expect(parseIngredients("2 cups flour", "3.5")[0].content).toBe(
          "7 cups flour",
        );
      });
      it("keeps denom-16 fraction in original unit when cooking-friendly", () => {
        expect(parseIngredients("1 teaspoon vanilla", "1/4")[0].content).toBe(
          "1/4 teaspoon vanilla",
        );
      });
    });

    describe("brace-embedded supplementary measurements", () => {
      it("scales {unit} brace alongside the main measurement", () => {
        const result = parseIngredients("1 cup of soy sauce ({236ml})", "2")[0]
          .content;
        expect(result).toBe("2 cup of soy sauce (472ml)");
      });

      it("preserves {unit} brace content at scale 1", () => {
        const result = parseIngredients("1 cup of soy sauce ({236ml})", "1")[0]
          .content;
        expect(result).toBe("1 cup of soy sauce (236ml)");
      });

      it("scales {unit} brace down to clean fraction", () => {
        const result = parseIngredients("1 cup sugar ({16tbsp})", "1/2")[0]
          .content;
        expect(result).toBe("1/2 cup sugar (8tbsp)");
      });

      it("supports spaced unit inside brace", () => {
        const result = parseIngredients("1 cup milk ({240 ml})", "2")[0]
          .content;
        expect(result).toBe("2 cup milk (480 ml)");
      });

      it("scales brace when it is the only measurement on the line", () => {
        const result = parseIngredients("{236ml} of soy sauce", "2")[0].content;
        expect(result).toBe("472ml of soy sauce");
      });

      it("scales multiple braces on the same line independently", () => {
        const result = parseIngredients(
          "1 cup ({236ml}) and 2 tsp ({10ml}) of things",
          "2",
        )[0].content;
        expect(result).toBe("2 cup (472ml) and 2 tsp (20ml) of things");
      });

      it("leaves non-measurement brace content alone", () => {
        const result = parseIngredients(
          "1 cup flour {note not scalable} here",
          "2",
        )[0].content;
        expect(result).toBe("2 cup flour {note not scalable} here");
      });

      it("leaves empty braces alone", () => {
        const result = parseIngredients("1 cup flour {} here", "2")[0].content;
        expect(result).toBe("2 cup flour {} here");
      });

      it("wraps scaled brace content in bold tag for html", () => {
        const result = parseIngredients("1 cup soy sauce ({236ml})", "2")[0]
          .htmlContent;
        expect(result).toContain('<b class="ingredientMeasurement">472ml</b>');
      });

      it("preserves originalContent with the raw brace syntax", () => {
        const result = parseIngredients("1 cup soy sauce ({236ml})", "2")[0];
        expect(result.originalContent).toBe("1 cup soy sauce ({236ml})");
      });

      it("scales unicode fraction inside brace", () => {
        const result = parseIngredients("1 cup sugar ({½ pint})", "2")[0]
          .content;
        expect(result).toBe("2 cup sugar (1 pint)");
      });

      it("scales decimal inside brace", () => {
        const result = parseIngredients("1 cup flour ({0.5 cup})", "2")[0]
          .content;
        expect(result).toBe("2 cup flour (1 cup)");
      });

      it("scales range inside brace", () => {
        const result = parseIngredients("1 cup flour ({1-2 cups} milk)", "2")[0]
          .content;
        expect(result).toBe("2 cup flour (2-4 cups milk)");
      });

      it("preserves non-measurement brace content verbatim without scaling its digits", () => {
        const result = parseIngredients("1 cup ({.5 cup} note)", "2")[0]
          .content;
        expect(result).toBe("2 cup ({.5 cup} note)");
      });

      it("preserves multipart-style brace content verbatim (unsupported)", () => {
        const result = parseIngredients(
          "1 cup flour ({1 cup + 2 tbsp})",
          "2",
        )[0].content;
        expect(result).toBe("2 cup flour ({1 cup + 2 tbsp})");
      });

      it("keeps plaintextContent consistent with content for brace lines", () => {
        const result = parseIngredients("1 cup soy sauce ({236ml})", "2")[0];
        expect(result.plaintextContent).toBe(result.content);
      });
    });

    describe("edge cases and robustness", () => {
      it("returns empty array for empty input", () => {
        expect(parseIngredients("", "2")).toEqual([]);
      });

      it("preserves whitespace-only lines", () => {
        const result = parseIngredients("  ", "2");
        expect(result).toHaveLength(1);
        expect(result[0].content).toBe("  ");
      });

      it("strips surrounding whitespace on scaling", () => {
        const result = parseIngredients("   1 cup flour   ", "2");
        expect(result[0].content).toBe("2 cup flour");
      });

      it("scales with scale of 0 to literal 0", () => {
        const result = parseIngredients("1 cup flour", "0");
        expect(result[0].content).toBe("0 cup flour");
      });

      it("handles very large scale", () => {
        const result = parseIngredients("1 cup flour", "100000");
        expect(result[0].content).toBe("100000 cup flour");
      });

      it("preserves zero-value measurement", () => {
        expect(parseIngredients("0 cups flour", "2")[0].content).toBe(
          "0 cups flour",
        );
      });

      it("scales three-way multipart with plus delimiter", () => {
        const result = parseIngredients("1 cup + 2 tbsp + 3 tsp sugar", "2")[0]
          .content;
        expect(result).toBe("2 cup + 4 tbsp + 6 tsp sugar");
      });

      it("scales mixed decimal and fraction range per part", () => {
        expect(parseIngredients("0.25-1/2 cup sugar", "3")[0].content).toBe(
          "0.75-1 1/2 cup sugar",
        );
      });

      it("preserves tabs between measurement and ingredient text", () => {
        const result = parseIngredients("1 cup\t\tof flour", "2")[0].content;
        expect(result).toBe("2 cup\t\tof flour");
      });

      it("splits on real newlines", () => {
        const result = parseIngredients("1 cup milk\n2 eggs", "2");
        expect(result).toHaveLength(2);
        expect(result[0].content).toBe("2 cup milk");
        expect(result[1].content).toBe("4 eggs");
      });

      it("treats escaped newline as inline continuation within a single ingredient", () => {
        const result = parseIngredients("1 cup milk\\\nwhole", "2");
        expect(result).toHaveLength(1);
        expect(result[0].content).toBe("2 cup milk\nwhole");
      });
    });

    describe("multi-lingual support", () => {
      it("scales ingredient with Arabic ingredient name and ASCII digits", () => {
        const result = parseIngredients("1 كوب دقيق", "2")[0];
        expect(result.content).toBe("2 كوب دقيق");
        expect(result.isRtl).toBe(true);
      });

      it("scales ingredient with Hebrew ingredient name and ASCII digits", () => {
        const result = parseIngredients("1 כוס קמח", "2")[0];
        expect(result.content).toBe("2 כוס קמח");
        expect(result.isRtl).toBe(true);
      });

      it("scales Swedish tablespoon alias (spsk)", () => {
        expect(parseIngredients("1 spsk socker", "2")[0].content).toBe(
          "2 spsk socker",
        );
      });

      it("scales Swedish pinch alias (knsp)", () => {
        expect(parseIngredients("1 knsp salt", "2")[0].content).toBe(
          "2 knsp salt",
        );
      });

      it("leaves Arabic-Indic digits untouched (not currently parsed)", () => {
        // Documents current limitation: Arabic-Indic digits like "١" are
        // not matched by \d+ in JavaScript without the /u flag. Preserved
        // rather than throwing so users see their input unchanged.
        expect(parseIngredients("١ كوب دقيق", "2")[0].content).toBe(
          "١ كوب دقيق",
        );
      });
    });

    describe("absurd-result fallback", () => {
      it("avoids raw decimals for weird denominators", () => {
        const result = parseIngredients("1 cup sugar", "1/17")[0].content;
        expect(result).not.toContain("0.0588");
        expect(result).not.toContain("0.059");
        // Should be either a clean fraction (possibly with tilde) or a
        // unitz-ts-chosen smaller unit that has no decimal.
        expect(result).not.toMatch(/\d\.\d/);
      });
      it("marks approximations with a tilde when truly rounded", () => {
        const result = parseIngredients("3 eggs", "1/17")[0].content;
        expect(result).toMatch(/^~\d/);
        expect(result).toContain("eggs");
      });
      it("emits an exact integer or fraction without tilde when arithmetic is exact", () => {
        expect(parseIngredients("3 eggs", "1/3")[0].content).toBe("1 eggs");
      });
    });

    describe("decimal vs cooking fraction by unit system", () => {
      it("scales grams to a decimal, not a fraction, when result is non-integer", () => {
        expect(parseIngredients("120 g bread flour", "1/16")[0].content).toBe(
          "7.5 g bread flour",
        );
      });
      it("scales millilitres to a decimal", () => {
        expect(parseIngredients("100 ml milk", "1/4")[0].content).toBe(
          "25 ml milk",
        );
      });
      it("rounds metric results that need >3 decimals with a tilde", () => {
        expect(parseIngredients("100 ml milk", "1/3")[0].content).toBe(
          "~33.333 ml milk",
        );
      });
      it("emits exact integers in metric without a fractional part", () => {
        expect(parseIngredients("120 g bread flour", "2/3")[0].content).toBe(
          "80 g bread flour",
        );
      });
      it("keeps cooking fractions for imperial volumes", () => {
        expect(parseIngredients("1 cup sugar", "1/16")[0].content).toBe(
          "1/16 cup sugar",
        );
      });
      it("keeps cooking fractions for imperial weights", () => {
        expect(parseIngredients("8 oz cheese", "1/4")[0].content).toBe(
          "2 oz cheese",
        );
      });
    });

    describe("metric/imperial conversion", () => {
      it("converts cups to metric volume", () => {
        const result = parseIngredients("2 cups flour", "1", System.METRIC)[0]
          .content;
        expect(result).toMatch(/\b(ml|l|cl|dl)\b/);
        expect(result).not.toContain("cup");
        expect(result).toContain("flour");
      });

      it("converts cups to metric after scaling", () => {
        const result = parseIngredients("2 cups flour", "2", System.METRIC)[0]
          .content;
        expect(result).toMatch(/\b(ml|l|cl|dl)\b/);
        expect(result).not.toContain("cup");
      });

      it("converts metric volume to imperial", () => {
        const result = parseIngredients("500 ml milk", "1", System.US)[0]
          .content;
        expect(result).not.toMatch(/\bml\b/);
        expect(result).toContain("milk");
      });

      it("converts weight from US to metric", () => {
        const result = parseIngredients("4 oz cheese", "1", System.METRIC)[0]
          .content;
        expect(result).toMatch(/\b(g|kg|mg)\b/);
        expect(result).not.toMatch(/\boz\b/);
      });

      it("converts small volumes (tbsp) to metric", () => {
        const result = parseIngredients("1 tbsp oil", "1", System.METRIC)[0]
          .content;
        expect(result).toMatch(/\b(ml|l|cl|dl)\b/);
      });

      it("preserves user notation when already in target system (metric)", () => {
        const result = parseIngredients("500 ml milk", "1", System.METRIC)[0]
          .content;
        expect(result).toBe("500 ml milk");
      });

      it("scales in user notation when already in target system", () => {
        const result = parseIngredients("500 ml milk", "2", System.METRIC)[0]
          .content;
        expect(result).toBe("1000 ml milk");
      });

      it("preserves decimal notation when already in target system", () => {
        const result = parseIngredients("1.7 L water", "6", System.METRIC)[0]
          .content;
        expect(result).toBe("10.2 L water");
      });

      it("leaves unit-less ingredients untouched in metric", () => {
        const result = parseIngredients("3 eggs", "1", System.METRIC)[0]
          .content;
        expect(result).toBe("3 eggs");
      });

      it("leaves unit-less ingredients untouched in imperial", () => {
        const result = parseIngredients("3 eggs", "2", System.US)[0].content;
        expect(result).toBe("6 eggs");
      });

      it("leaves system-agnostic units (can) untouched", () => {
        const result = parseIngredients("1 can tomatoes", "1", System.METRIC)[0]
          .content;
        expect(result).toBe("1 can tomatoes");
      });

      it("leaves system-agnostic units (pinch) untouched", () => {
        const result = parseIngredients("1 pinch salt", "2", System.US)[0]
          .content;
        expect(result).toContain("pinch");
        expect(result).toMatch(/^2 /);
      });

      it("is a no-op when targetSystem is not provided", () => {
        const result = parseIngredients("2 cups flour", "1")[0].content;
        expect(result).toBe("2 cups flour");
      });

      it("converts each side of a range", () => {
        const result = parseIngredients("1-2 cups milk", "1", System.METRIC)[0]
          .content;
        expect(result).toMatch(/\b(ml|l|cl|dl)\b/);
        expect(result).not.toContain("cup");
      });

      it("converts each part of a multipart measurement independently", () => {
        const result = parseIngredients(
          "1 cup + 2 tbsp flour",
          "1",
          System.METRIC,
        )[0].content;
        expect(result).toMatch(/\b(ml|l|cl|dl)\b/);
        expect(result).not.toContain("cup");
        expect(result).not.toContain("tbsp");
        expect(result).toContain(" + ");
      });

      it("converts outer measurement and brace measurement together", () => {
        const result = parseIngredients(
          "1 cup soy sauce ({8 fl oz})",
          "1",
          System.METRIC,
        )[0].content;
        expect(result).toMatch(/\b(ml|l|cl|dl)\b/);
        expect(result).not.toContain("cup");
        expect(result).not.toContain("fl oz");
      });

      it("leaves brace untouched when already in target system", () => {
        const result = parseIngredients(
          "1 cup soy sauce ({236ml})",
          "1",
          System.METRIC,
        )[0].content;
        expect(result).toContain("236ml");
      });

      it("wraps converted measurement in bold for html output", () => {
        const result = parseIngredients("2 cups flour", "1", System.METRIC)[0]
          .htmlContent;
        expect(result).toMatch(
          /<b class="ingredientMeasurement">[^<]*(ml|l|cl|dl)[^<]*<\/b>/,
        );
      });
    });
  });

  describe("parseInstructions", () => {
    describe("basic parsing", () => {
      it("parses single instruction with step counting", () => {
        const result = parseInstructions("Mix the ingredients", "1");
        expect(result).toHaveLength(1);
        expect(result[0].content).toBe("Mix the ingredients");
        expect(result[0].count).toBe(1);
        expect(result[0].isHeader).toBe(false);
        expect(result[0].complete).toBe(false);
      });

      it("increments step count for multiple instructions", () => {
        const result = parseInstructions("Mix flour\nAdd eggs\nBake", "1");
        expect(result).toHaveLength(3);
        expect(result[0].count).toBe(1);
        expect(result[1].count).toBe(2);
        expect(result[2].count).toBe(3);
      });

      it("filters out empty lines", () => {
        const result = parseInstructions("Mix flour\n\nAdd eggs", "1");
        expect(result).toHaveLength(2);
      });
    });

    describe("headers", () => {
      it("detects headers in brackets", () => {
        const result = parseInstructions("[Preparation]\nMix ingredients", "1");
        expect(result[0].isHeader).toBe(true);
        expect(result[0].content).toBe("Preparation");
        expect(result[0].count).toBe(0);
      });

      it("resets step count after header", () => {
        const result = parseInstructions(
          "Mix\nStir\n[Baking]\nPreheat\nBake",
          "1",
        );
        expect(result[0].count).toBe(1);
        expect(result[1].count).toBe(2);
        expect(result[2].isHeader).toBe(true);
        expect(result[3].count).toBe(1);
        expect(result[4].count).toBe(2);
      });

      it("formats headers with bold tag in html", () => {
        const result = parseInstructions("[Cooking]", "1");
        expect(result[0].htmlContent).toBe(
          '<b class="sectionHeader">Cooking</b>',
        );
      });
    });

    describe("scaling with curly braces", () => {
      it("scales numbers in curly braces", () => {
        const result = parseInstructions("Add {2} cups flour", "2");
        expect(result[0].content).toBe("Add 4 cups flour");
      });

      it("scales fractions in curly braces", () => {
        const result = parseInstructions("Add {1/2} cup sugar", "2");
        expect(result[0].content).toBe("Add 1 cup sugar");
      });

      it("wraps scaled measurements in bold tags for html", () => {
        const result = parseInstructions("Add {2} cups flour", "2");
        expect(result[0].htmlContent).toContain(
          '<b class="instructionMeasurement">4</b>',
        );
      });

      it("leaves non-numeric curly braces unchanged", () => {
        const result = parseInstructions("Add {variable} to mix", "1");
        expect(result[0].content).toBe("Add {variable} to mix");
      });

      it("uses clean-denominator output for number-only braces", () => {
        const result = parseInstructions("Add {2} cups", "1/3");
        expect(result[0].content).toBe("Add 2/3 cups");
      });

      it("scales mixed fraction inside brace", () => {
        const result = parseInstructions("Add {1 1/2} cups", "2");
        expect(result[0].content).toBe("Add 3 cups");
      });

      it("scales range inside brace", () => {
        const result = parseInstructions("Mix for {3-4} minutes", "2");
        expect(result[0].content).toBe("Mix for 6-8 minutes");
      });

      it("rounds time with tilde when no clean fraction fits", () => {
        const result = parseInstructions("Bake {30} minutes", "0.5");
        expect(result[0].content).toBe("Bake 15 minutes");
      });

      it("leaves empty braces untouched", () => {
        const result = parseInstructions("Test {} empty", "2");
        expect(result[0].content).toBe("Test {} empty");
      });
    });

    describe("scaling with brace-embedded units", () => {
      it("scales {number unit} as a measurement", () => {
        const result = parseInstructions("Add {2 cups} flour", "1/2");
        expect(result[0].content).toBe("Add 1 cups flour");
      });

      it("preserves brace-embedded unit at scale 1", () => {
        const result = parseInstructions("Add {2 cups} flour", "1");
        expect(result[0].content).toBe("Add 2 cups flour");
      });

      it("scales fraction with unit inside brace", () => {
        const result = parseInstructions("Add {1/2 cup} sugar", "2");
        expect(result[0].content).toBe("Add 1 cup sugar");
      });

      it("scales fraction to clean fraction with unit inside brace", () => {
        const result = parseInstructions("Add {1/3 cup} sugar", "2");
        expect(result[0].content).toBe("Add 2/3 cup sugar");
      });

      it("scales range with unit inside brace", () => {
        const result = parseInstructions("Add {1-2 cups} flour", "2");
        expect(result[0].content).toBe("Add 2-4 cups flour");
      });

      it("leaves non-unit trailing text untouched", () => {
        const result = parseInstructions("Bake at {350}°F", "1");
        expect(result[0].content).toBe("Bake at 350°F");
      });

      it("scales time unit inside brace", () => {
        const result = parseInstructions("Bake for {30 minutes}", "1/3");
        expect(result[0].content).toBe("Bake for 10 minutes");
      });

      it("wraps full number+unit result in bold tag for html", () => {
        const result = parseInstructions("Add {2 cups} flour", "2");
        expect(result[0].htmlContent).toContain(
          '<b class="instructionMeasurement">4 cups</b>',
        );
      });

      it("scales unicode fraction inside brace", () => {
        const result = parseInstructions("Add {½ cup} sugar", "2");
        expect(result[0].content).toBe("Add 1 cup sugar");
      });

      it("scales decimal inside brace", () => {
        const result = parseInstructions("Add {0.5 cup} sugar", "2");
        expect(result[0].content).toBe("Add 1 cup sugar");
      });

      it("scales no-space number+unit brace", () => {
        const result = parseInstructions("Pour {236ml} water", "2");
        expect(result[0].content).toBe("Pour 472ml water");
      });

      it("preserves non-measurement multipart brace content verbatim", () => {
        const result = parseInstructions("Add {1 cup + 2 tbsp} flour", "2");
        expect(result[0].content).toBe("Add {1 cup + 2 tbsp} flour");
      });
    });

    describe("metric/imperial conversion", () => {
      it("converts brace measurement to metric", () => {
        const result = parseInstructions(
          "Add {2 cups} flour",
          "1",
          System.METRIC,
        )[0].content;
        expect(result).toMatch(/\b(ml|l|cl|dl)\b/);
        expect(result).not.toContain("cup");
      });

      it("scales then converts brace measurement to metric", () => {
        const result = parseInstructions(
          "Add {2 cups} flour",
          "2",
          System.METRIC,
        )[0].content;
        expect(result).toMatch(/\b(ml|l|cl|dl)\b/);
        expect(result).not.toContain("cup");
      });

      it("leaves plain number brace untouched when converting", () => {
        const result = parseInstructions(
          "Bake at {350}°F",
          "1",
          System.METRIC,
        )[0].content;
        expect(result).toBe("Bake at 350°F");
      });

      it("leaves time brace untouched when converting", () => {
        const result = parseInstructions(
          "Bake for {30 minutes}",
          "1",
          System.METRIC,
        )[0].content;
        expect(result).toBe("Bake for 30 minutes");
      });

      it("is a no-op when targetSystem is not provided", () => {
        const result = parseInstructions("Add {2 cups} flour", "1")[0].content;
        expect(result).toBe("Add 2 cups flour");
      });

      it("wraps converted brace measurement in bold for html", () => {
        const result = parseInstructions(
          "Add {2 cups} flour",
          "1",
          System.METRIC,
        )[0].htmlContent;
        expect(result).toMatch(
          /<b class="instructionMeasurement">[^<]*(ml|l|cl|dl)[^<]*<\/b>/,
        );
      });
    });

    describe("line continuations", () => {
      it("converts escaped newlines to actual newlines but not independent steps", () => {
        const result = parseInstructions(
          "Mix flour and\\\nsugar together",
          "1",
        );
        expect(result[0].content).toBe("Mix flour and\nsugar together");
      });

      it("converts escaped newlines to br tags in html but not independent steps", () => {
        const result = parseInstructions(
          "Mix flour and\\\nsugar together",
          "1",
        );
        expect(result[0].htmlContent).toContain("<br>");
      });
    });

    describe("rtl text", () => {
      it("detects rtl text", () => {
        const result = parseInstructions("اخلط المكونات", "1");
        expect(result[0].isRtl).toBe(true);
      });

      it("detects ltr text", () => {
        const result = parseInstructions("Mix ingredients", "1");
        expect(result[0].isRtl).toBe(false);
      });
    });

    describe("image references", () => {
      const images = [
        { url: "https://cdn.example/img-one.jpg" },
        { url: "https://cdn.example/img-two.jpg" },
      ];

      it("renders a figure for a bare token when images provided", () => {
        const result = parseInstructions("![image:1]", "1", undefined, images);
        expect(result[0].htmlContent).toBe(
          '<figure class="inlineImage"><img src="https://cdn.example/img-one.jpg" alt="Image 1"></figure>',
        );
      });

      it("renders figcaption when caption provided", () => {
        const result = parseInstructions(
          "![image:2|Golden brown]",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toBe(
          '<figure class="inlineImage"><img src="https://cdn.example/img-two.jpg" alt="Golden brown"><figcaption>Golden brown</figcaption></figure>',
        );
      });

      it("escapes dangerous characters in caption", () => {
        const result = parseInstructions(
          "![image:1|<script>alert(1)</script>]",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).not.toContain("<script>");
        expect(result[0].htmlContent).toContain("&lt;script&gt;");
      });

      it("matches case-insensitively and tolerates whitespace", () => {
        const result = parseInstructions(
          "![ IMAGE : 2 | cap ]",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toContain(
          '<img src="https://cdn.example/img-two.jpg" alt="cap">',
        );
      });

      it("renders escaped raw token when index is out of range", () => {
        const result = parseInstructions(
          "![image:5|missing]",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toBe("![image:5|missing]");
      });

      it("renders escaped raw token when no images provided", () => {
        const result = parseInstructions("![image:1]", "1");
        expect(result[0].htmlContent).toBe("![image:1]");
      });

      it("places figure inline within a step's text", () => {
        const result = parseInstructions(
          "Stir well. ![image:1|mid] Then rest.",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toBe(
          'Stir well. <figure class="inlineImage"><img src="https://cdn.example/img-one.jpg" alt="mid"><figcaption>mid</figcaption></figure> Then rest.',
        );
      });

      it("numbers a step that contains only an image token", () => {
        const result = parseInstructions(
          "First step\n![image:1]\nThird step",
          "1",
          undefined,
          images,
        );
        expect(result[0].count).toBe(1);
        expect(result[1].count).toBe(2);
        expect(result[2].count).toBe(3);
      });

      it("preserves the raw token in the content field", () => {
        const result = parseInstructions(
          "Do thing ![image:1|cap]",
          "1",
          undefined,
          images,
        );
        expect(result[0].content).toBe("Do thing ![image:1|cap]");
      });

      it("replaces the token with caption text in plaintextContent", () => {
        const result = parseInstructions(
          "Do thing ![image:1|cap]",
          "1",
          undefined,
          images,
        );
        expect(result[0].plaintextContent).toBe("Do thing cap");
      });

      it("replaces the token with empty string in plaintextContent when no caption", () => {
        const result = parseInstructions(
          "Do thing ![image:1]",
          "1",
          undefined,
          images,
        );
        expect(result[0].plaintextContent).toBe("Do thing ");
      });

      it("coexists with bold and italic markers around the token", () => {
        const result = parseInstructions(
          "**bold** ![image:1|cap] *italic*",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toBe(
          '<b>bold</b> <figure class="inlineImage"><img src="https://cdn.example/img-one.jpg" alt="cap"><figcaption>cap</figcaption></figure> <i>italic</i>',
        );
      });

      it("adds small modifier class for ![image:N:small]", () => {
        const result = parseInstructions(
          "![image:1:small]",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toBe(
          '<figure class="inlineImage inlineImage--small"><img src="https://cdn.example/img-one.jpg" alt="Image 1"></figure>',
        );
      });

      it("supports size modifier with caption", () => {
        const result = parseInstructions(
          "![image:2:large|Hero shot]",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toBe(
          '<figure class="inlineImage inlineImage--large"><img src="https://cdn.example/img-two.jpg" alt="Hero shot"><figcaption>Hero shot</figcaption></figure>',
        );
      });

      it("omits modifier class for medium (the default)", () => {
        const result = parseInstructions(
          "![image:1:medium]",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toBe(
          '<figure class="inlineImage"><img src="https://cdn.example/img-one.jpg" alt="Image 1"></figure>',
        );
      });

      it("falls back to default size when modifier is unknown", () => {
        const result = parseInstructions(
          "![image:1:huge|cap]",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toBe(
          '<figure class="inlineImage"><img src="https://cdn.example/img-one.jpg" alt="cap"><figcaption>cap</figcaption></figure>',
        );
      });

      it("matches size modifier case-insensitively", () => {
        const result = parseInstructions(
          "![image:1:SMALL|cap]",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toContain("inlineImage--small");
      });

      it("supports xlarge size modifier", () => {
        const result = parseInstructions(
          "![image:1:xlarge|Hero]",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toContain("inlineImage--xlarge");
      });

      it("plaintextContent ignores the size modifier", () => {
        const result = parseInstructions(
          "See ![image:1:small|caption here]",
          "1",
          undefined,
          images,
        );
        expect(result[0].plaintextContent).toBe("See caption here");
      });
    });
  });

  describe("parseNotes", () => {
    describe("basic parsing", () => {
      it("parses single note", () => {
        const result = parseNotes("Store in refrigerator");
        expect(result).toHaveLength(1);
        expect(result[0].content).toBe("Store in refrigerator");
        expect(result[0].isHeader).toBe(false);
      });

      it("parses multiple notes", () => {
        const result = parseNotes("Best served cold\nKeeps for 3 days");
        expect(result).toHaveLength(2);
      });
    });

    describe("headers", () => {
      it("detects headers in brackets", () => {
        const result = parseNotes("[Storage Tips]\nKeep refrigerated");
        expect(result[0].isHeader).toBe(true);
        expect(result[0].content).toBe("Storage Tips");
        expect(result[1].isHeader).toBe(false);
      });

      it("formats headers with bold tag in html", () => {
        const result = parseNotes("[Tips]");
        expect(result[0].htmlContent).toBe('<b class="sectionHeader">Tips</b>');
      });
    });

    describe("line continuations", () => {
      it("converts escaped newlines to actual newlines", () => {
        const result = parseNotes("Store in\\\nrefrigerator");
        expect(result[0].content).toBe("Store in\nrefrigerator");
      });

      it("converts escaped newlines to br tags in html", () => {
        const result = parseNotes("Store in\\\nrefrigerator");
        expect(result[0].htmlContent).toContain("<br>");
      });
    });

    describe("rtl text", () => {
      it("detects rtl text", () => {
        const result = parseNotes("احفظ في الثلاجة");
        expect(result[0].isRtl).toBe(true);
      });

      it("detects ltr text", () => {
        const result = parseNotes("Keep refrigerated");
        expect(result[0].isRtl).toBe(false);
      });
    });

    describe("tables", () => {
      it("parses a basic table", () => {
        const result = parseNotes(
          "| Name | Amount |\n| --- | --- |\n| Salt | 1 tsp |",
        );
        expect(result).toHaveLength(1);
        expect(result[0].isTable).toBe(true);
        expect(result[0].isHeader).toBe(false);
        expect(result[0].htmlContent).toContain("<table");
        expect(result[0].htmlContent).toContain("<th>Name</th>");
        expect(result[0].htmlContent).toContain("<th>Amount</th>");
        expect(result[0].htmlContent).toContain("<td>Salt</td>");
        expect(result[0].htmlContent).toContain("<td>1 tsp</td>");
      });

      it("parses a table with alignment", () => {
        const result = parseNotes(
          "| Left | Center | Right |\n| --- | :---: | ---: |\n| a | b | c |",
        );
        expect(result).toHaveLength(1);
        expect(result[0].htmlContent).toContain("<th>Left</th>");
        expect(result[0].htmlContent).toContain(
          '<th style="text-align:center">Center</th>',
        );
        expect(result[0].htmlContent).toContain(
          '<th style="text-align:right">Right</th>',
        );
      });

      it("preserves content before and after a table", () => {
        const result = parseNotes(
          "Some note\n| A | B |\n| --- | --- |\n| 1 | 2 |\nAnother note",
        );
        expect(result).toHaveLength(3);
        expect(result[0].isTable).toBe(false);
        expect(result[0].content).toBe("Some note");
        expect(result[1].isTable).toBe(true);
        expect(result[2].isTable).toBe(false);
        expect(result[2].content).toBe("Another note");
      });

      it("parses a header-only table with no body rows", () => {
        const result = parseNotes("| A | B |\n| --- | --- |");
        expect(result).toHaveLength(1);
        expect(result[0].isTable).toBe(true);
        expect(result[0].htmlContent).toContain("<th>A</th>");
        expect(result[0].htmlContent).not.toContain("<tbody>");
      });

      it("does not treat pipe lines without separator as table", () => {
        const result = parseNotes("| not a table |");
        expect(result).toHaveLength(1);
        expect(result[0].isTable).toBe(false);
      });

      it("sets isTable to false on non-table lines", () => {
        const result = parseNotes("Regular note");
        expect(result[0].isTable).toBe(false);
      });

      it("preserves raw content for plain text output", () => {
        const input = "| A | B |\n| --- | --- |\n| 1 | 2 |";
        const result = parseNotes(input);
        expect(result[0].content).toBe(input);
      });

      it("handles empty cells", () => {
        const result = parseNotes("| A | B |\n| --- | --- |\n| | val |");
        expect(result).toHaveLength(1);
        expect(result[0].isTable).toBe(true);
        expect(result[0].htmlContent).toContain("<td></td>");
        expect(result[0].htmlContent).toContain("<td>val</td>");
      });

      it("handles body rows with fewer columns than header", () => {
        const result = parseNotes(
          "| A | B | C |\n| --- | --- | --- |\n| only |",
        );
        expect(result).toHaveLength(1);
        expect(result[0].isTable).toBe(true);
        expect(result[0].htmlContent).toContain("<td>only</td>");
        expect(result[0].htmlContent).toMatch(/<td><\/td>.*<td><\/td>/);
      });

      it("drops extra columns in body rows beyond header count", () => {
        const result = parseNotes("| A |\n| --- |\n| 1 | 2 | 3 |");
        expect(result).toHaveLength(1);
        expect(result[0].htmlContent).toContain("<td>1</td>");
        expect(result[0].htmlContent).not.toContain("<td>2</td>");
        expect(result[0].htmlContent).not.toContain("<td>3</td>");
      });

      it("passes cell content through to html", () => {
        const result = parseNotes("| Header |\n| --- |\n| some content |");
        expect(result).toHaveLength(1);
        expect(result[0].htmlContent).toContain("<td>some content</td>");
      });

      it("handles escaped pipes in cell content", () => {
        const result = parseNotes(
          "| Formula | Result |\n| --- | --- |\n| a \\| b | yes |",
        );
        expect(result).toHaveLength(1);
        expect(result[0].htmlContent).toContain("<td>a | b</td>");
        expect(result[0].htmlContent).toContain("<td>yes</td>");
      });

      it("handles multiple tables separated by text", () => {
        const result = parseNotes(
          "| A |\n| --- |\n| 1 |\nSome text\n| B |\n| --- |\n| 2 |",
        );
        expect(result).toHaveLength(3);
        expect(result[0].isTable).toBe(true);
        expect(result[1].isTable).toBe(false);
        expect(result[1].content).toBe("Some text");
        expect(result[2].isTable).toBe(true);
      });

      it("handles table immediately after a header note", () => {
        const result = parseNotes(
          "[Section]\n| A | B |\n| --- | --- |\n| 1 | 2 |",
        );
        expect(result).toHaveLength(2);
        expect(result[0].isHeader).toBe(true);
        expect(result[0].content).toBe("Section");
        expect(result[1].isTable).toBe(true);
      });

      it("handles whitespace-only cells", () => {
        const result = parseNotes("|   |   |\n| --- | --- |\n|   |   |");
        expect(result).toHaveLength(1);
        expect(result[0].isTable).toBe(true);
        expect(result[0].htmlContent).toContain("<th></th>");
        expect(result[0].htmlContent).toContain("<td></td>");
      });
    });

    describe("scaling with curly braces", () => {
      it("scales numbers in curly braces", () => {
        const result = parseNotes("Use {2} cups broth", "2");
        expect(result[0].content).toBe("Use 4 cups broth");
      });

      it("scales fractions in curly braces", () => {
        const result = parseNotes("Use {1/2} cup milk", "2");
        expect(result[0].content).toBe("Use 1 cup milk");
      });

      it("wraps scaled measurements in bold tags for html", () => {
        const result = parseNotes("Use {2} cups broth", "2");
        expect(result[0].htmlContent).toContain(
          '<b class="noteMeasurement">4</b>',
        );
      });

      it("leaves non-numeric curly braces unchanged", () => {
        const result = parseNotes("Use {variable} to mix", "1");
        expect(result[0].content).toBe("Use {variable} to mix");
      });

      it("scales {number unit} as a measurement", () => {
        const result = parseNotes("Use {2 cups} broth", "1/2");
        expect(result[0].content).toBe("Use 1 cups broth");
      });

      it("wraps full number+unit result in bold tag for html", () => {
        const result = parseNotes("Use {2 cups} broth", "2");
        expect(result[0].htmlContent).toContain(
          '<b class="noteMeasurement">4 cups</b>',
        );
      });

      it("scales unicode fraction inside brace", () => {
        const result = parseNotes("Use {½ cup} sugar", "2");
        expect(result[0].content).toBe("Use 1 cup sugar");
      });

      it("defaults scale to 1 when not provided", () => {
        const result = parseNotes("Use {2 cups} broth");
        expect(result[0].content).toBe("Use 2 cups broth");
      });

      it("scales braces inside table cells", () => {
        const result = parseNotes(
          "| Name | Amount |\n| --- | --- |\n| Broth | {2 cups} |",
          "2",
        );
        expect(result[0].isTable).toBe(true);
        expect(result[0].htmlContent).toContain(
          '<td><b class="noteMeasurement">4 cups</b></td>',
        );
        expect(result[0].content).toContain("| Broth | 4 cups |");
      });

      it("scales braces inside header notes", () => {
        const result = parseNotes("[Use {2 cups} broth]", "2");
        expect(result[0].isHeader).toBe(true);
        expect(result[0].content).toBe("Use 4 cups broth");
        expect(result[0].htmlContent).toContain(
          '<b class="noteMeasurement">4 cups</b>',
        );
      });

      it("converts brace measurement to metric", () => {
        const result = parseNotes("Use {2 cups} broth", "1", System.METRIC)[0]
          .content;
        expect(result).toMatch(/\b(ml|l|cl|dl)\b/);
        expect(result).not.toContain("cup");
      });
    });

    describe("image references", () => {
      const images = [{ url: "https://cdn.example/img-one.jpg" }];

      it("renders a figure inside a note", () => {
        const result = parseNotes(
          "See ![image:1|here]",
          "1",
          undefined,
          images,
        );
        expect(result[0].htmlContent).toBe(
          'See <figure class="inlineImage"><img src="https://cdn.example/img-one.jpg" alt="here"><figcaption>here</figcaption></figure>',
        );
      });

      it("escapes raw token when images missing", () => {
        const result = parseNotes("See ![image:1]");
        expect(result[0].htmlContent).toBe("See ![image:1]");
      });

      it("strips tokens from plaintextContent", () => {
        const result = parseNotes(
          "See ![image:1|alt text]",
          "1",
          undefined,
          images,
        );
        expect(result[0].plaintextContent).toBe("See alt text");
      });

      it("preserves raw tokens in content", () => {
        const result = parseNotes("See ![image:1|cap]", "1", undefined, images);
        expect(result[0].content).toBe("See ![image:1|cap]");
      });

      it("renders tokens inside table cells", () => {
        const result = parseNotes(
          "| col |\n| --- |\n| ![image:1] |",
          "1",
          undefined,
          images,
        );
        expect(result[0].isTable).toBe(true);
        expect(result[0].htmlContent).toContain(
          '<figure class="inlineImage"><img src="https://cdn.example/img-one.jpg" alt="Image 1"></figure>',
        );
      });
    });
  });

  describe("stripImageTokens", () => {
    it("replaces token with caption when present", () => {
      expect(stripImageTokens("Before ![image:1|cap] after")).toBe(
        "Before cap after",
      );
    });

    it("replaces token with empty string when no caption", () => {
      expect(stripImageTokens("Before ![image:2] after")).toBe("Before  after");
    });

    it("handles multiple tokens", () => {
      expect(stripImageTokens("![image:1|one] and ![image:2|two]")).toBe(
        "one and two",
      );
    });

    it("leaves non-matching text alone", () => {
      expect(stripImageTokens("Plain text with [brackets]")).toBe(
        "Plain text with [brackets]",
      );
    });
  });

  describe("applyInlineFormattingWithImages", () => {
    const images = [{ url: "https://cdn.example/a.jpg" }];

    it("renders the figure and the surrounding inline formatting", () => {
      expect(
        applyInlineFormattingWithImages("**a** ![image:1|b]", images),
      ).toBe(
        '<b>a</b> <figure class="inlineImage"><img src="https://cdn.example/a.jpg" alt="b"><figcaption>b</figcaption></figure>',
      );
    });

    it("escapes HTML-dangerous chars in image URL", () => {
      const dangerous = [{ url: 'https://x.test/"><script>' }];
      const out = applyInlineFormattingWithImages("![image:1]", dangerous);
      expect(out).not.toContain("<script>");
      expect(out).toContain("&quot;");
    });

    it("uses Image N as alt text when no caption", () => {
      expect(applyInlineFormattingWithImages("![image:1]", images)).toBe(
        '<figure class="inlineImage"><img src="https://cdn.example/a.jpg" alt="Image 1"></figure>',
      );
    });
  });

  describe("applyInlineFormatting", () => {
    it("converts **bold** to <b> tags", () => {
      expect(applyInlineFormatting("some **bold** text")).toBe(
        "some <b>bold</b> text",
      );
    });

    it("converts *italic* to <i> tags", () => {
      expect(applyInlineFormatting("some *italic* text")).toBe(
        "some <i>italic</i> text",
      );
    });

    it("converts __underline__ to <u> tags", () => {
      expect(applyInlineFormatting("some __underline__ text")).toBe(
        "some <u>underline</u> text",
      );
    });

    it("converts ***bold italic*** to nested <b><i> tags", () => {
      expect(applyInlineFormatting("***both***")).toBe("<b><i>both</i></b>");
    });

    it("handles multiple formats in one line", () => {
      expect(
        applyInlineFormatting("**bold** and *italic* and __underline__"),
      ).toBe("<b>bold</b> and <i>italic</i> and <u>underline</u>");
    });

    it("handles nested bold within italic context", () => {
      expect(applyInlineFormatting("*italic **bold** italic*")).toBe(
        "<i>italic <b>bold</b> italic</i>",
      );
    });

    it("returns plain text unchanged", () => {
      expect(applyInlineFormatting("no formatting here")).toBe(
        "no formatting here",
      );
    });

    it("leaves unmatched delimiters unchanged", () => {
      expect(applyInlineFormatting("a single * asterisk")).toBe(
        "a single * asterisk",
      );
      expect(applyInlineFormatting("a __ single")).toBe("a __ single");
    });
  });

  describe("stripInlineFormatting", () => {
    it("strips **bold** markers", () => {
      expect(stripInlineFormatting("some **bold** text")).toBe(
        "some bold text",
      );
    });

    it("strips *italic* markers", () => {
      expect(stripInlineFormatting("some *italic* text")).toBe(
        "some italic text",
      );
    });

    it("strips __underline__ markers", () => {
      expect(stripInlineFormatting("some __underline__ text")).toBe(
        "some underline text",
      );
    });

    it("strips ***bold italic*** markers", () => {
      expect(stripInlineFormatting("***both***")).toBe("both");
    });

    it("strips multiple formats in one line", () => {
      expect(
        stripInlineFormatting("**bold** and *italic* and __underline__"),
      ).toBe("bold and italic and underline");
    });

    it("leaves plain text unchanged", () => {
      expect(stripInlineFormatting("no formatting here")).toBe(
        "no formatting here",
      );
    });
  });

  describe("inline formatting in parsers", () => {
    it("applies inline formatting in parseIngredients htmlContent", () => {
      const result = parseIngredients("**bold** ingredient", "1");
      expect(result[0].htmlContent).toContain("<b>bold</b>");
      expect(result[0].content).toBe("**bold** ingredient");
      expect(result[0].plaintextContent).toBe("bold ingredient");
    });

    it("applies inline formatting in parseInstructions htmlContent", () => {
      const result = parseInstructions("*italic* step", "1");
      expect(result[0].htmlContent).toContain("<i>italic</i>");
      expect(result[0].content).toBe("*italic* step");
      expect(result[0].plaintextContent).toBe("italic step");
    });

    it("applies inline formatting in parseNotes htmlContent", () => {
      const result = parseNotes("__underlined__ note");
      expect(result[0].htmlContent).toContain("<u>underlined</u>");
      expect(result[0].content).toBe("__underlined__ note");
      expect(result[0].plaintextContent).toBe("underlined note");
    });

    it("applies inline formatting in table cells", () => {
      const result = parseNotes(
        "| **Bold** | *Italic* |\n| --- | --- |\n| __underline__ | plain |",
      );
      expect(result[0].htmlContent).toContain("<th><b>Bold</b></th>");
      expect(result[0].htmlContent).toContain("<th><i>Italic</i></th>");
      expect(result[0].htmlContent).toContain("<td><u>underline</u></td>");
      expect(result[0].htmlContent).toContain("<td>plain</td>");
    });
  });

  describe("isRtlText", () => {
    describe("language detection", () => {
      it("returns false for english text", () => {
        const result = isRtlText("Hello world");
        expect(result).toBe(false);
      });

      it("returns true for arabic text", () => {
        const result = isRtlText("مرحبا بالعالم");
        expect(result).toBe(true);
      });

      it("returns true for hebrew text", () => {
        const result = isRtlText("שלום עולם");
        expect(result).toBe(true);
      });
    });

    describe("mixed text", () => {
      it("returns result based on character majority when checking whole text", () => {
        const result = isRtlText("Hi مرحبا بالعالم الجميل", false);
        expect(result).toBe(true);
      });
    });

    describe("onlyFirstWord parameter", () => {
      it("checks only first word when true", () => {
        const result = isRtlText("مرحبا Hello world", true);
        expect(result).toBe(true);
      });

      it("checks entire text when false", () => {
        const result = isRtlText("مرحبا Hello world everyone", false);
        expect(result).toBe(false);
      });

      it("defaults to true when not specified", () => {
        const result = isRtlText("مرحبا Hello world");
        expect(result).toBe(true);
      });
    });
  });
});
