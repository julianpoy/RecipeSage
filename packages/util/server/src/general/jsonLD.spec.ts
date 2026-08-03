import { describe, it, expect } from "vitest";
import { jsonLDToStandardizedRecipeImportEntry, type JsonLD } from "./jsonLD";

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

      expect(entry.recipe.ingredients).toEqual("\n1 cup flour");
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

    it("skips a non-string recipe category", () => {
      const jsonLD: JsonLD = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test",
        recipeCategory: ["Dessert", { name: "Cake" }],
      };

      const entry = jsonLDToStandardizedRecipeImportEntry(jsonLD);

      expect(entry.labels).toEqual(["Dessert"]);
    });
  });
});
