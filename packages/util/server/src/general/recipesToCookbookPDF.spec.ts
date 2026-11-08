import { describe, it, expect, vi } from "vitest";
import { buffer } from "node:stream/consumers";
import type { RecipeSummary } from "@recipesage/prisma";
import { extractTextFromPDF } from "./extractTextFromPDF";
import {
  generateCookbookPDFStream,
  type CookbookOptions,
} from "./recipesToCookbookPDF";

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

  const secondRecipe: RecipeSummary = {
    ...baseRecipe,
    id: "0f5b1b1e-0000-4000-8000-000000000001",
    title: "Second Recipe",
  };

  const recipeWithOptionalDetails: RecipeSummary = {
    ...baseRecipe,
    lastMadeAt: "2026-03-15",
    recipeLabels: [
      {
        id: "0f5b1b1e-0000-4000-8000-000000000002",
        labelId: "0f5b1b1e-0000-4000-8000-000000000003",
        recipeId: baseRecipe.id,
        createdAt: baseRecipe.createdAt,
        updatedAt: baseRecipe.updatedAt,
        label: {
          id: "0f5b1b1e-0000-4000-8000-000000000003",
          userId: user.id,
          title: "Spicy",
          createdAt: baseRecipe.createdAt,
          updatedAt: baseRecipe.updatedAt,
          labelGroupId: null,
          labelGroup: null,
          _count: {
            recipeLabels: 1,
          },
        },
      },
    ],
    recipeLinks: [
      {
        id: "0f5b1b1e-0000-4000-8000-000000000004",
        linkedRecipe: {
          id: "0f5b1b1e-0000-4000-8000-000000000005",
          userId: user.id,
          fromUserId: null,
          title: "Linked Salad",
          description: "",
          yield: "",
          activeTime: "",
          totalTime: "",
          source: "",
          url: "",
          folder: "main",
          createdAt: baseRecipe.createdAt,
          updatedAt: baseRecipe.updatedAt,
          lastMadeAt: null,
          rating: null,
          recipeLabels: [],
          recipeImages: [],
          fromUser: null,
          user,
        },
      },
    ],
  };

  const generateCookbookPageTexts = async (
    options: Partial<CookbookOptions> = {},
    recipes: RecipeSummary[] = [baseRecipe, secondRecipe],
    onProgress?: (processedCount: number) => void,
  ) => {
    const stream = await generateCookbookPDFStream(
      recipes,
      {
        title: "My Cookbook",
        includeToc: true,
        includePageNumbers: false,
        includeImages: false,
        includeLabels: false,
        includeLastMade: false,
        includeLinkedRecipes: false,
        includeRecipeSageUrl: false,
        language: "en-us",
        introductionLabel: "Introduction",
        contentsLabel: "Contents",
        byAuthorTemplate: "by {{author}}",
        ...options,
      },
      onProgress,
    );
    const text = await extractTextFromPDF(await buffer(stream), 10);

    return text
      .split("\f")
      .map((page) => page.trim())
      .filter((page) => page.length > 0);
  };

  const lastLineOf = (page: string) => page.split("\n").at(-1)?.trim();

  describe("cover", () => {
    it("prints only the title when there is no subtitle or author", async () => {
      const pages = await generateCookbookPageTexts();

      expect(pages[0]).toBe("My Cookbook");
    });

    it("prints the subtitle and the author in the byAuthorTemplate", async () => {
      const pages = await generateCookbookPageTexts({
        subtitle: "Family Favorites",
        author: "Sam Baker",
      });

      expect(pages[0]).toContain("My Cookbook");
      expect(pages[0]).toContain("Family Favorites");
      expect(pages[0]).toContain("by Sam Baker");
    });
  });

  describe("introduction", () => {
    it("prints the introduction on its own page after the cover", async () => {
      const pages = await generateCookbookPageTexts({
        introduction: "These recipes are from my family.",
      });

      expect(pages).toHaveLength(5);
      expect(pages[1]).toContain("Introduction");
      expect(pages[1]).toContain("These recipes are from my family.");
      expect(pages[2]).toContain("Contents");
    });

    it("does not print an introduction page when there is no text", async () => {
      const pages = await generateCookbookPageTexts();

      expect(pages).toHaveLength(4);
      expect(pages.join("\n")).not.toContain("Introduction");
    });

    it("moves the later page numbers by one", async () => {
      const pages = await generateCookbookPageTexts({
        includePageNumbers: true,
        introduction: "These recipes are from my family.",
      });

      expect(pages.slice(1).map(lastLineOf)).toEqual(["2", "3", "4", "5"]);
      expect(pages[2]).toMatch(/First Recipe\W+4\b/);
      expect(pages[2]).toMatch(/Second Recipe\W+5\b/);
    });
  });

  describe("table of contents", () => {
    it("does not print a contents page when includeToc is false", async () => {
      const pages = await generateCookbookPageTexts({ includeToc: false });

      expect(pages).toHaveLength(3);
      expect(pages.join("\n")).not.toContain("Contents");
    });
  });

  describe("page numbers", () => {
    it("prints page numbers on every page except the cover when enabled", async () => {
      const pages = await generateCookbookPageTexts({
        includePageNumbers: true,
      });

      expect(pages.map(lastLineOf)).toEqual(["My Cookbook", "2", "3", "4"]);
    });

    it("prints page numbers that match the table of contents", async () => {
      const pages = await generateCookbookPageTexts({
        includePageNumbers: true,
      });

      expect(pages[1]).toMatch(/First Recipe\W+3\b/);
      expect(pages[1]).toMatch(/Second Recipe\W+4\b/);
      expect(pages[2]).toContain("First Recipe");
      expect(pages[3]).toContain("Second Recipe");
    });

    it("does not print page numbers when disabled", async () => {
      const pages = await generateCookbookPageTexts({
        includePageNumbers: false,
      });

      expect(pages.map(lastLineOf)).toEqual([
        "My Cookbook",
        expect.stringMatching(/Second Recipe\W+4$/),
        "First Recipe",
        "Second Recipe",
      ]);
    });

    it("prints page numbers when there is no table of contents", async () => {
      const pages = await generateCookbookPageTexts({
        includePageNumbers: true,
        includeToc: false,
      });

      expect(pages.map(lastLineOf)).toEqual(["My Cookbook", "2", "3"]);
    });

    it("counts each page of a recipe that fills more than one page", async () => {
      const longRecipe: RecipeSummary = {
        ...baseRecipe,
        instructions: Array.from(
          { length: 60 },
          (_, index) => `Mix the ingredients for step ${index + 1}`,
        ).join("\n"),
      };

      const pages = await generateCookbookPageTexts(
        { includePageNumbers: true },
        [longRecipe, secondRecipe],
      );

      expect(pages.map(lastLineOf)).toEqual([
        "My Cookbook",
        "2",
        "3",
        "4",
        "5",
      ]);
      expect(pages[1]).toMatch(/First Recipe\W+3\b/);
      expect(pages[1]).toMatch(/Second Recipe\W+5\b/);
      expect(pages[4]).toContain("Second Recipe");
    });
  });

  describe("recipes", () => {
    it("prints recipes in the given order", async () => {
      const pages = await generateCookbookPageTexts({}, [
        secondRecipe,
        baseRecipe,
      ]);

      expect(pages[1]).toMatch(/Second Recipe\W+3\b/);
      expect(pages[1]).toMatch(/First Recipe\W+4\b/);
      expect(pages[2]).toContain("Second Recipe");
      expect(pages[3]).toContain("First Recipe");
    });

    it("calls onProgress once for each recipe with the processed count", async () => {
      const onProgress = vi.fn();

      await generateCookbookPageTexts({}, undefined, onProgress);

      expect(onProgress.mock.calls).toEqual([[1], [2]]);
    });
  });

  describe("recipe options", () => {
    it.each([
      {
        optionName: "includeLabels",
        enabledOptions: { includeLabels: true },
        expectedText: "Spicy",
      },
      {
        optionName: "includeLastMade",
        enabledOptions: { includeLastMade: true },
        expectedText: "Last made",
      },
      {
        optionName: "includeLinkedRecipes",
        enabledOptions: { includeLinkedRecipes: true },
        expectedText: "Linked Salad",
      },
      {
        optionName: "includeRecipeSageUrl",
        enabledOptions: { includeRecipeSageUrl: true },
        expectedText: `/app/recipe/${baseRecipe.id}`,
      },
    ])(
      "prints $expectedText only when $optionName is on",
      async ({ enabledOptions, expectedText }) => {
        const recipes = [recipeWithOptionalDetails];

        const pagesWhenOn = await generateCookbookPageTexts(
          enabledOptions,
          recipes,
        );
        const pagesWhenOff = await generateCookbookPageTexts({}, recipes);

        expect(pagesWhenOn.join("\n")).toContain(expectedText);
        expect(pagesWhenOff.join("\n")).not.toContain(expectedText);
      },
    );
  });
});
