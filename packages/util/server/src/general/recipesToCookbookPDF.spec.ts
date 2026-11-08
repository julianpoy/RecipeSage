import { describe, it, expect } from "vitest";
import { buffer } from "node:stream/consumers";
import type { RecipeSummary } from "@recipesage/prisma";
import { extractTextFromPDF } from "./extractTextFromPDF";
import { generateCookbookPDFStream } from "./recipesToCookbookPDF";

describe("generateCookbookPDFStream", () => {
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
    title: "First Recipe",
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

  const generateCookbookPageTexts = async (includePageNumbers: boolean) => {
    const stream = await generateCookbookPDFStream(
      [
        baseRecipe,
        {
          ...baseRecipe,
          id: "0f5b1b1e-0000-4000-8000-000000000001",
          title: "Second Recipe",
        },
      ],
      {
        title: "My Cookbook",
        includeToc: true,
        includePageNumbers,
        includeImages: false,
        includeLabels: false,
        includeLastMade: false,
        includeLinkedRecipes: false,
        includeRecipeSageUrl: false,
        language: "en-us",
        introductionLabel: "Introduction",
        contentsLabel: "Contents",
        byAuthorTemplate: "by {{author}}",
      },
    );
    const text = await extractTextFromPDF(await buffer(stream), 10);

    return text
      .split("\f")
      .map((page) => page.trim())
      .filter((page) => page.length > 0);
  };

  const lastLineOf = (page: string) => page.split("\n").at(-1)?.trim();

  it("prints page numbers on every page except the cover when enabled", async () => {
    const pages = await generateCookbookPageTexts(true);

    expect(pages.map(lastLineOf)).toEqual(["My Cookbook", "2", "3", "4"]);
  });

  it("prints page numbers that match the table of contents", async () => {
    const pages = await generateCookbookPageTexts(true);

    expect(pages[1]).toMatch(/First Recipe\W+3\b/);
    expect(pages[1]).toMatch(/Second Recipe\W+4\b/);
    expect(pages[2]).toContain("First Recipe");
    expect(pages[3]).toContain("Second Recipe");
  });

  it("does not print page numbers when disabled", async () => {
    const lastLines = (await generateCookbookPageTexts(false)).map(lastLineOf);

    expect(lastLines).toHaveLength(4);
    expect(lastLines).not.toContain("2");
    expect(lastLines).not.toContain("3");
    expect(lastLines).not.toContain("4");
  });
});
