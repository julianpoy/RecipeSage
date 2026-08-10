import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import bodyParser from "body-parser";
import request from "supertest";

const recipeFindUniqueMock = vi.fn();
const recipeToJSONLDMock = vi.fn();

vi.mock("@recipesage/prisma", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  prisma: {
    recipe: {
      findUnique: (...args: unknown[]) => recipeFindUniqueMock(...args),
    },
  },
}));

vi.mock("@recipesage/util/server/general", () => ({
  recipeToJSONLD: (...args: unknown[]) => recipeToJSONLDMock(...args),
  sortRecipeImages: (recipe: unknown) => recipe,
  validateSession: vi.fn(),
  extendSession: vi.fn(),
}));

vi.mock("@recipesage/util/server/db", () => ({
  convertPrismaRecipeSummaryToRecipeSummary: (recipe: unknown) => recipe,
}));

const RECIPE_ID = "b0a4c6d2-9d9e-4a2f-8b6a-2f1f4b3c9d10";

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
    recipeToJSONLDMock.mockReset();
  });

  it("returns the json-ld of the recipe with a 200", async () => {
    const recipe = { id: RECIPE_ID };
    const jsonLd = { "@type": "Recipe", identifier: RECIPE_ID };
    recipeFindUniqueMock.mockResolvedValue(recipe);
    recipeToJSONLDMock.mockReturnValue(jsonLd);

    const app = await buildApp();
    const response = await request(app).get(`/recipes/${RECIPE_ID}/json-ld`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(jsonLd);
    expect(recipeToJSONLDMock).toHaveBeenCalledWith(recipe);
  });

  it("allows cross origin requests so the embed snippet works", async () => {
    recipeFindUniqueMock.mockResolvedValue({ id: RECIPE_ID });
    recipeToJSONLDMock.mockReturnValue({});

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
    expect(recipeToJSONLDMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the recipe id is not a uuid", async () => {
    const app = await buildApp();
    const response = await request(app).get("/recipes/not-a-uuid/json-ld");

    expect(response.status).toBe(400);
    expect(recipeFindUniqueMock).not.toHaveBeenCalled();
  });
});
