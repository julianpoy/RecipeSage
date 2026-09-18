import { describe, it, expect } from "vitest";
import type { RecipeSummary } from "@recipesage/prisma";
import { recipeToPDFMakeSchema } from "./recipeSummariesToPDF";

describe("recipeToPDFMakeSchema", () => {
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

  const renderedTextOf = async (recipe: RecipeSummary) =>
    JSON.stringify(await recipeToPDFMakeSchema(recipe, { language: "en-us" }));

  it("renders ampersands as plain characters", async () => {
    const rendered = await renderedTextOf({
      ...baseRecipe,
      ingredients: "[Vegetables & Sausages]\n1 zucchini",
      instructions: "Slice & roast",
      notes: "Salt & pepper",
    });

    expect(rendered).toContain("Vegetables & Sausages");
    expect(rendered).toContain("Slice & roast");
    expect(rendered).toContain("Salt & pepper");
    expect(rendered).not.toContain("&amp;");
  });

  it("renders ampersands as plain characters when input is already sanitized", async () => {
    const rendered = await renderedTextOf({
      ...baseRecipe,
      ingredients: "[Vegetables &amp; Sausages]\n1 zucchini",
      instructions: "Slice &amp; roast",
      notes: "Salt &amp; pepper",
    });

    expect(rendered).toContain("Vegetables & Sausages");
    expect(rendered).toContain("Slice & roast");
    expect(rendered).toContain("Salt & pepper");
    expect(rendered).not.toContain("&amp;");
  });
});
