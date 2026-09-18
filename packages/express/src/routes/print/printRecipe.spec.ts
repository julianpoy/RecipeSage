import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import path from "path";
import request from "supertest";

const recipeFindUniqueMock = vi.fn();

vi.mock("@recipesage/prisma", () => ({
  prisma: {
    recipe: {
      findUnique: (...args: unknown[]) => recipeFindUniqueMock(...args),
    },
  },
  recipeSummary: {},
}));

vi.mock("@recipesage/util/server/db", () => ({}));

vi.mock("@recipesage/util/server/general", () => ({
  validateSession: vi.fn(async () => ({
    id: "session-id",
    userId: "user-id",
  })),
  extendSession: vi.fn(),
  RateLimitTier: {},
  config: {
    appUi: {
      baseUrl: "https://recipesage.example",
    },
  },
  getRequestLanguage: () => "en-us",
  formatDateUTC: (date: Date) => date.toISOString().slice(0, 10),
  formatDateUTCLocalized: (dateStr: string) => dateStr,
  getNutritionDisplayRows: async () => [],
  sanitizeRemoveHtmlFromString: (input: string) => input,
  sortRecipeImages: <T>(recipe: T) => recipe,
  translate: async (_language: string, key: string) => key,
}));

const buildApp = async () => {
  const { printRouter } = await import("./index");
  const app = express();
  app.set("views", path.resolve(__dirname, "../../../../backend/src/views"));
  app.set("view engine", "pug");
  app.use("/print", printRouter);
  return app;
};

const recipe = {
  id: "recipe-id",
  userId: "owner-id",
  title: "Test Recipe",
  description: "",
  yield: "",
  activeTime: "",
  totalTime: "",
  source: "",
  url: "",
  ingredients: "1 cup flour",
  instructions: "Mix",
  notes: "",
  rating: null,
  lastMadeAt: new Date("2026-09-10T00:00:00.000Z"),
  nutritionServingSize: null,
  nutritionOtherDetails: null,
  recipeImages: [],
  recipeLabels: [],
  recipeLinks: [
    {
      id: "link-id",
      linkedRecipe: {
        id: "linked-recipe-id",
        title: "Linked Recipe",
      },
    },
  ],
};

describe("GET /print/recipe/:recipeId", () => {
  beforeEach(() => {
    recipeFindUniqueMock.mockReset();
    recipeFindUniqueMock.mockResolvedValue(recipe);
  });

  it("does not show the last made date unless it is enabled", async () => {
    const app = await buildApp();
    const response = await request(app)
      .get("/print/recipe/recipe-id")
      .query({ version: "1", today: "2026-09-18" });

    expect(response.status).toBe(200);
    expect(response.text).not.toContain("2026-09-10");
  });

  it("shows the last made date when it is enabled", async () => {
    const app = await buildApp();
    const response = await request(app)
      .get("/print/recipe/recipe-id")
      .query({ version: "1", today: "2026-09-18", showLastMade: "true" });

    expect(response.status).toBe(200);
    expect(response.text).toContain("2026-09-10");
  });

  it("shows linked recipes by default", async () => {
    const app = await buildApp();
    const response = await request(app)
      .get("/print/recipe/recipe-id")
      .query({ version: "1" });

    expect(response.status).toBe(200);
    expect(response.text).toContain("Linked Recipe");
    expect(response.text).toContain(
      "https://recipesage.example/app/recipe/linked-recipe-id",
    );
  });

  it("does not show linked recipes when they are hidden", async () => {
    const app = await buildApp();
    const response = await request(app)
      .get("/print/recipe/recipe-id")
      .query({ version: "1", hideLinkedRecipes: "true" });

    expect(response.status).toBe(200);
    expect(response.text).not.toContain("Linked Recipe");
  });
});
