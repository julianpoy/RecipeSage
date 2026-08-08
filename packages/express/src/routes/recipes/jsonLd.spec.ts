import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import bodyParser from "body-parser";
import request from "supertest";

const recipeFindUniqueMock = vi.fn();

vi.mock("@recipesage/prisma", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  prisma: {
    recipe: {
      findUnique: (...args: unknown[]) => recipeFindUniqueMock(...args),
    },
  },
}));

vi.mock("@recipesage/util/server/general", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  validateSession: vi.fn(),
  extendSession: vi.fn(),
}));

const RECIPE_ID = "b0a4c6d2-9d9e-4a2f-8b6a-2f1f4b3c9d10";

const buildRecipe = (overrides?: Record<string, unknown>) => ({
  id: RECIPE_ID,
  userId: "9d9e4a2f-8b6a-4c6d-b0a4-2f1f4b3c9d11",
  title: "Tomato Soup",
  description: "A simple soup",
  yield: "4 servings",
  activeTime: "10 minutes",
  totalTime: "30 minutes",
  source: "Grandma",
  url: "https://example.com/tomato-soup",
  notes: "Best with bread",
  ingredients: "2 cups tomatoes\n1 tbsp olive oil",
  instructions: "Chop the tomatoes\nSimmer for 20 minutes",
  rating: 4,
  folder: "main",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastMadeAt: null,
  recipeImages: [
    {
      order: 0,
      image: {
        id: "4b3c9d10-2f1f-4a2f-8b6a-b0a4c6d29d9e",
        location: "https://example.com/soup.jpg",
      },
    },
  ],
  recipeLabels: [
    {
      label: {
        id: "2f1f4b3c-9d10-4a2f-8b6a-b0a4c6d29d9e",
        title: "dinner",
      },
    },
  ],
  ...overrides,
});

const buildApp = async () => {
  const { recipesRouter } = await import("./index");
  const app = express();
  app.use(bodyParser.json());
  app.use("/recipes", recipesRouter);
  return app;
};

describe("GET /recipes/:recipeId/json-ld", () => {
  beforeEach(() => {
    recipeFindUniqueMock.mockReset();
  });

  it("returns json-ld for a recipe with ingredients and instructions", async () => {
    recipeFindUniqueMock.mockResolvedValue(buildRecipe());

    const app = await buildApp();
    const response = await request(app).get(`/recipes/${RECIPE_ID}/json-ld`);

    expect(response.status).toBe(200);
    expect(response.body["@type"]).toBe("Recipe");
    expect(response.body.name).toBe("Tomato Soup");
    expect(response.body.identifier).toBe(RECIPE_ID);
    expect(response.body.recipeIngredient).toEqual([
      "2 cups tomatoes",
      "1 tbsp olive oil",
    ]);
    expect(response.body.recipeInstructions).toEqual([
      { "@type": "HowToStep", text: "Chop the tomatoes" },
      { "@type": "HowToStep", text: "Simmer for 20 minutes" },
    ]);
    expect(response.body.image).toEqual(["https://example.com/soup.jpg"]);
    expect(response.body.recipeCategory).toEqual(["dinner"]);
  });

  it("converts bracketed instruction lines to HowToSection", async () => {
    recipeFindUniqueMock.mockResolvedValue(
      buildRecipe({
        instructions: "[Prep]\nChop the tomatoes",
      }),
    );

    const app = await buildApp();
    const response = await request(app).get(`/recipes/${RECIPE_ID}/json-ld`);

    expect(response.status).toBe(200);
    expect(response.body.recipeInstructions).toEqual([
      { "@type": "HowToSection", name: "Prep" },
      { "@type": "HowToStep", text: "Chop the tomatoes" },
    ]);
  });

  it("allows cross origin requests so the embed snippet works", async () => {
    recipeFindUniqueMock.mockResolvedValue(buildRecipe());

    const app = await buildApp();
    const response = await request(app)
      .get(`/recipes/${RECIPE_ID}/json-ld`)
      .set("Origin", "https://someones-food-blog.example");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
  });

  it("returns 404 when the recipe does not exist", async () => {
    recipeFindUniqueMock.mockResolvedValue(null);

    const app = await buildApp();
    const response = await request(app).get(`/recipes/${RECIPE_ID}/json-ld`);

    expect(response.status).toBe(404);
  });

  it("returns 400 when the recipe id is not a uuid", async () => {
    const app = await buildApp();
    const response = await request(app).get("/recipes/not-a-uuid/json-ld");

    expect(response.status).toBe(400);
    expect(recipeFindUniqueMock).not.toHaveBeenCalled();
  });
});
