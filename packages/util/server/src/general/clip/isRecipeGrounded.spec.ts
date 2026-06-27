import { describe, it, expect } from "vitest";
import { isRecipeGrounded, recipeGroundingScore } from "./isRecipeGrounded";

const sourceText = [
  "One Pan Jambalaya",
  "1 Tablespoon oil (vegetable or canola oil)",
  "1 pound andouille sausage, cut into 1/4 inch thick slices",
  "1 1/2 pounds boneless skinless chicken breasts, cut into bite-size pieces",
  "1 green bell pepper, diced",
  "1 yellow onion, diced",
  "2 cups long grain white rice",
  "In a large skillet with a fitted lid, add the oil over medium high heat.",
  "Add the chicken and cook, flipping once or twice to brown on all sides.",
  "Add sausage and cook until browned on both sides.",
  "Stir in the rice and cook until the liquid is absorbed.",
].join("\n");

describe("isRecipeGrounded", () => {
  it("accepts a recipe whose lines are drawn verbatim from the source", () => {
    const recipe = {
      title: "One Pan Jambalaya",
      ingredients: [
        "1 Tablespoon oil (vegetable or canola oil)",
        "1 pound andouille sausage, cut into 1/4 inch thick slices",
        "1 green bell pepper, diced",
        "2 cups long grain white rice",
      ].join("\n"),
      instructions: [
        "In a large skillet with a fitted lid, add the oil over medium high heat.",
        "Add sausage and cook until browned on both sides.",
      ].join("\n"),
    };

    expect(recipeGroundingScore(recipe, sourceText)).toBe(1);
    expect(isRecipeGrounded(recipe, sourceText)).toBe(true);
  });

  it("rejects a recipe invented from nothing present in the source", () => {
    const invented = {
      title: "One Pan Jambalaya",
      ingredients: [
        "1 lb large shrimp, peeled and deveined",
        "1 (14.5 ounce) can fire roasted diced tomatoes, undrained",
        "1 1/2 teaspoons smoked paprika",
        "3 green onions, thinly sliced on the bias",
      ].join("\n"),
      instructions: [
        "Whisk together the buttermilk and hot sauce in a shallow bowl.",
        "Transfer to a parchment-lined baking sheet and chill overnight.",
      ].join("\n"),
    };

    expect(recipeGroundingScore(invented, sourceText)).toBeLessThan(0.5);
    expect(isRecipeGrounded(invented, sourceText)).toBe(false);
  });

  it("rejects a recipe grounded only against an unrelated error body", () => {
    const errorBody =
      '{"config":{"asp":true,"url":"https://example.com/one-pan-jambalaya/"},"result":{"status":"ERR::THROTTLE::MAX_CONCURRENT_REQUEST_EXCEEDED"}}';
    const recipe = {
      title: "One Pan Jambalaya",
      ingredients: [
        "1 pound andouille sausage, cut into 1/4 inch thick slices",
        "1 green bell pepper, diced",
      ].join("\n"),
      instructions: "Add sausage and cook until browned on both sides.",
    };

    expect(recipeGroundingScore(recipe, errorBody)).toBe(0);
    expect(isRecipeGrounded(recipe, errorBody)).toBe(false);
  });

  it("ignores section headers when scoring", () => {
    const recipe = {
      title: "One Pan Jambalaya",
      ingredients: [
        "[For the Jambalaya]",
        "# For the sauce",
        "1 green bell pepper, diced",
        "2 cups long grain white rice",
      ].join("\n"),
      instructions: "Stir in the rice and cook until the liquid is absorbed.",
    };

    expect(recipeGroundingScore(recipe, sourceText)).toBe(1);
  });

  it("is robust to casing and whitespace differences", () => {
    const recipe = {
      title: "Jambalaya",
      ingredients: "1 GREEN BELL PEPPER,   diced",
      instructions: "ADD SAUSAGE AND COOK until browned on both sides.",
    };

    expect(isRecipeGrounded(recipe, sourceText)).toBe(true);
  });

  it("grounds non-latin scripts the same way", () => {
    const japaneseSource = [
      "プルコギの作り方",
      "牛肉の薄切り 300グラム",
      "玉ねぎ 1個をうす切りにする",
      "醤油 大さじ3と砂糖 大さじ1を混ぜ合わせる",
      "牛肉を漬けだれに30分ほど漬け込む",
    ].join("\n");

    const grounded = {
      title: "プルコギ",
      ingredients: "牛肉の薄切り 300グラム\n玉ねぎ 1個をうす切りにする",
      instructions: "牛肉を漬けだれに30分ほど漬け込む",
    };
    const invented = {
      title: "プルコギ",
      ingredients: "鶏もも肉 500グラム\nにんにく 5かけをみじん切りにする",
      instructions: "鶏肉を強火で5分間炒めてから取り出す",
    };

    expect(isRecipeGrounded(grounded, japaneseSource)).toBe(true);
    expect(isRecipeGrounded(invented, japaneseSource)).toBe(false);
  });

  it("returns undefined and rejects a recipe with no ingredient or instruction lines", () => {
    const empty = {
      title: "One Pan Jambalaya",
      ingredients: "",
      instructions: "",
    };

    expect(recipeGroundingScore(empty, sourceText)).toBeUndefined();
    expect(isRecipeGrounded(empty, sourceText)).toBe(false);
  });

  it("matches short lines below the window size as substrings", () => {
    const source = "Pinch of salt\nA squeeze of lemon\nIce cubes";
    const recipe = {
      title: "Drink",
      ingredients: "Ice cubes",
      instructions: "A squeeze of lemon",
    };

    expect(isRecipeGrounded(recipe, source)).toBe(true);
  });
});
