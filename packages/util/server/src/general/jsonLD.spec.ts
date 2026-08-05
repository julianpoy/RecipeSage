import { describe, it, expect } from "vitest";
import type { RecipeSummary } from "@recipesage/prisma";
import {
  jsonLDToStandardizedRecipeImportEntry,
  recipeToJSONLD,
  type JsonLD,
} from "./jsonLD";

describe("jsonLDToStandardizedRecipeImportEntry", () => {
  describe("recipeInstructions", () => {
    it("keeps section headers written as a name", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeInstructions: [
          { "@type": "HowToSection", name: "Prep" },
          { "@type": "HowToStep", text: "Chop onions" },
          { "@type": "HowToSection", name: "Cook" },
          { "@type": "HowToStep", text: "Fry them" },
        ],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.recipe.instructions).toEqual(
        "[Prep]\nChop onions\n[Cook]\nFry them",
      );
    });

    it("keeps section headers written as text by older exports", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeInstructions: [
          { "@type": "HowToSection", text: "[Prep]" },
          { "@type": "HowToStep", text: "Chop onions" },
          { "@type": "HowToSection", text: "[Cook]" },
          { "@type": "HowToStep", text: "Fry them" },
        ],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.recipe.instructions).toEqual(
        "[Prep]\nChop onions\n[Cook]\nFry them",
      );
    });

    it("keeps steps nested within a section", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeInstructions: [
          {
            "@type": "HowToSection",
            name: "Prep",
            itemListElement: [
              { text: "Chop onions" },
              { text: "Mince garlic" },
            ],
          },
        ],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.recipe.instructions).toEqual(
        "[Prep]\nChop onions\nMince garlic",
      );
    });
  });

  describe("null entries", () => {
    it("skips a null instruction", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeInstructions: [null, { "@type": "HowToStep", text: "Step" }],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.recipe.instructions).toEqual("Step");
    });

    it("skips a null ingredient", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeIngredient: [null, "1 cup flour"],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.recipe.ingredients).toEqual("1 cup flour");
    });

    it("skips a null image", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        image: [null, "https://example.com/1.jpg"],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.images).toEqual(["https://example.com/1.jpg"]);
    });

    it("reads the name of an object recipe category", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeCategory: ["Dessert", { name: "Cake" }],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.labels).toEqual(["Dessert", "Cake"]);
    });

    it("skips a recipe category that carries no name", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeCategory: ["Dessert", {}, null],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.labels).toEqual(["Dessert"]);
    });

    it("does not throw on a scalar image node", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        image: 1,
      };

      expect(() => jsonLDToStandardizedRecipeImportEntry(jsonLD)).not.toThrow();
    });

    it("does not throw on a null entry in a yield array", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeYield: ["4 servings", null],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.recipe.yield).toEqual("4 servings");
    });

    it("does not throw on a null entry in a comment array", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        comment: ["x", null],
      };

      expect(() => jsonLDToStandardizedRecipeImportEntry(jsonLD)).not.toThrow();
    });

    it("wraps an unbracketed section title as a header", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeInstructions: [
          { "@type": "HowToSection", text: "For the sauce" },
          { "@type": "HowToStep", text: "Simmer" },
        ],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.recipe.instructions).toEqual("[For the sauce]\nSimmer");
    });

    it("leaves section body prose as an ordinary instruction line", () => {
      const prose =
        "Before you begin, read through the whole recipe and make sure every ingredient is at room temperature.";
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeInstructions: [
          { "@type": "HowToSection", text: prose },
          { "@type": "HowToStep", text: "Simmer" },
        ],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.recipe.instructions).toEqual(`${prose}\nSimmer`);
    });

    it("does not double wrap a section title that is already bracketed", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeInstructions: [
          { "@type": "HowToSection", text: "[Prep]" },
          { "@type": "HowToStep", text: "Chop" },
        ],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.recipe.instructions).toEqual("[Prep]\nChop");
    });
  });
});

describe("recipeToJSONLD", () => {
  const user = {
    id: "0f5b1b1e-0000-4000-8000-00000000000a",
    name: "Tester",
    handle: null,
    enableProfile: false,
    incomingFriendship: false,
    outgoingFriendship: false,
    isMe: false,
    profileImages: [],
  };

  const baseRecipe: RecipeSummary = {
    id: "0f5b1b1e-0000-4000-8000-000000000000",
    userId: user.id,
    fromUserId: null,
    title: "Test",
    description: "",
    yield: "",
    activeTime: "",
    totalTime: "",
    source: "",
    url: "",
    folder: "main",
    ingredients: "",
    instructions: "",
    notes: "",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastMadeAt: null,
    rating: null,
    nutritionServingSize: null,
    nutritionCalories: null,
    nutritionTotalFat: null,
    nutritionSaturatedFat: null,
    nutritionTransFat: null,
    nutritionPolyunsaturatedFat: null,
    nutritionMonounsaturatedFat: null,
    nutritionCholesterol: null,
    nutritionSodium: null,
    nutritionTotalCarbs: null,
    nutritionDietaryFiber: null,
    nutritionTotalSugars: null,
    nutritionAddedSugars: null,
    nutritionProtein: null,
    nutritionVitaminD: null,
    nutritionCalcium: null,
    nutritionIron: null,
    nutritionPotassium: null,
    nutritionOtherDetails: null,
    recipeLabels: [],
    recipeImages: [],
    recipeLinks: [],
    fromUser: null,
    user,
  };

  const exportOf = (ingredients: string, instructions: string) =>
    recipeToJSONLD({
      ...baseRecipe,
      ingredients,
      instructions,
    });

  it("keeps scaling braces in exported ingredients", () => {
    const jsonLD = exportOf("{2 cups} flour", "");
    expect(jsonLD.recipeIngredient).toEqual(["{2 cups} flour"]);
  });

  it("keeps scaling braces in exported instructions", () => {
    const jsonLD = exportOf("", "Add {2 cups} water");
    expect(jsonLD.recipeInstructions).toEqual([
      { "@type": "HowToStep", text: "Add {2 cups} water" },
    ]);
  });

  it("keeps a line continuation as a single ingredient", () => {
    const jsonLD = exportOf("2 cups flour\\\nsifted", "");
    expect(jsonLD.recipeIngredient).toEqual(["2 cups flour\\\nsifted"]);
  });

  it("keeps unicode fractions in exported ingredients", () => {
    const jsonLD = exportOf("\u00bd cup milk", "");
    expect(jsonLD.recipeIngredient).toEqual(["\u00bd cup milk"]);
  });

  it("exports section headers as sections", () => {
    const jsonLD = exportOf("[Sauce]\n1 cup water", "[Prep]\nChop");
    expect(jsonLD.recipeIngredient).toEqual(["[Sauce]", "1 cup water"]);
    expect(jsonLD.recipeInstructions).toEqual([
      { "@type": "HowToSection", name: "Prep" },
      { "@type": "HowToStep", text: "Chop" },
    ]);
  });
});
