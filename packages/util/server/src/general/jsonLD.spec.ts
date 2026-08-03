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
});
