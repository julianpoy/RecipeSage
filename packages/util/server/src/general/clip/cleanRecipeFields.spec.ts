import { describe, it, expect } from "vitest";
import { cleanRecipeFields } from "./cleanRecipeFields";

describe("cleanRecipeFields", () => {
  it("removes section title lines from ingredients", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        ingredients: "Ingredients\n1 cup flour\n2 eggs",
      }).ingredients,
    ).toBe("1 cup flour\n2 eggs");
  });

  it("removes section title lines from instructions and notes", () => {
    const recipe = cleanRecipeFields({
      title: "Test",
      instructions: "Instructions:\nMix well",
      notes: "Notes\nBest served warm",
    });

    expect(recipe.instructions).toBe("Mix well");
    expect(recipe.notes).toBe("Best served warm");
  });

  it("removes a section title header on the first line", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        instructions: "[Directions]\nMix well",
      }).instructions,
    ).toBe("Mix well");
  });

  it("removes a leading section title header alongside real headers", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        ingredients:
          "[Ingredients]\n1 cup flour\n[For the crust]\n2 cups flour",
      }).ingredients,
    ).toBe("1 cup flour\n[For the crust]\n2 cups flour");
  });

  it("keeps a section title header that is not the first line", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        instructions: "Bake for 25 minutes\n[Notes]\nStore in the fridge",
      }).instructions,
    ).toBe("Bake for 25 minutes\n[Notes]\nStore in the fridge");
  });

  it("keeps genuine section headers", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        ingredients: "[For the sauce]\n1 cup cream",
      }).ingredients,
    ).toBe("[For the sauce]\n1 cup cream");
  });

  it("removes instruction lines that are only a step number", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        instructions: "Step 1\nMix well\n2.\nBake",
      }).instructions,
    ).toBe("Mix well\nBake");
  });

  it("keeps ingredient lines that are only a number", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        ingredients: "100\ngrams of butter",
      }).ingredients,
    ).toBe("100\ngrams of butter");
  });

  it("strips leading numbering from instruction lines", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        instructions:
          "1. Preheat the oven\n2) Mix well\nStep 3 - Bake\n4: Serve",
      }).instructions,
    ).toBe("Preheat the oven\nMix well\nBake\nServe");
  });

  it("does not treat a leading number followed by a dash as numbering", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        instructions: [
          "2 - 3 minutes, then remove from heat",
          "10 – twelve minutes until golden",
          "1 - ½ teaspoon of salt at a time",
          "8 - ounce block of cream cheese, softened",
          "9 - inch pan, greased and floured",
          "350 - degree oven, preheated",
        ].join("\n"),
      }).instructions,
    ).toBe(
      [
        "2 - 3 minutes, then remove from heat",
        "10 – twelve minutes until golden",
        "1 - ½ teaspoon of salt at a time",
        "8 - ounce block of cream cheese, softened",
        "9 - inch pan, greased and floured",
        "350 - degree oven, preheated",
      ].join("\n"),
    );
  });

  it("does not strip numbering from notes", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        notes: "1. Store in the fridge\n2. Reheat before serving",
      }).notes,
    ).toBe("1. Store in the fridge\n2. Reheat before serving");
  });

  it("does not strip quantities from ingredient lines", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        ingredients: "1. cup flour\n2 eggs\n1.5 cups milk",
      }).ingredients,
    ).toBe("1. cup flour\n2 eggs\n1.5 cups milk");
  });

  it("does not strip numbers that are part of the instruction text", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        instructions: "1.5 cups of water should be added\n350 degrees for 1 hr",
      }).instructions,
    ).toBe("1.5 cups of water should be added\n350 degrees for 1 hr");
  });

  it("returns an empty field when only a section title was present", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        ingredients: "Ingredients\n\n",
      }).ingredients,
    ).toBe("");
  });

  it("does not leave a blank line where a section title was removed", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        ingredients: "Ingredients\n\n1 cup flour\n2 eggs",
      }).ingredients,
    ).toBe("1 cup flour\n2 eggs");
  });

  it("normalizes carriage returns", () => {
    expect(
      cleanRecipeFields({
        title: "Test",
        instructions: "Instructions\r\n1. Mix well\r\nBake",
      }).instructions,
    ).toBe("Mix well\nBake");
  });

  it("leaves fields that are not present alone", () => {
    const recipe = cleanRecipeFields({ title: "Test" });

    expect(recipe.ingredients).toBe(undefined);
    expect(recipe.instructions).toBe(undefined);
    expect(recipe.notes).toBe(undefined);
  });
});
