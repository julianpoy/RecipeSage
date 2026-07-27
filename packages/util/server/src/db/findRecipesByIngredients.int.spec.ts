import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Prisma, prisma, User } from "@recipesage/prisma";
import { findRecipesByIngredients } from "./findRecipesByIngredients";
import { userFactory, recipeFactory } from "../general/factories";

describe("findRecipesByIngredients", () => {
  let owner: User;
  const cleanupIds: string[] = [];

  beforeEach(async () => {
    owner = await prisma.user.create({ data: userFactory() });
    cleanupIds.push(owner.id);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: cleanupIds } } });
    cleanupIds.length = 0;
  });

  const ownerConstraints = () => ({
    sessionUserId: owner.id,
    userIds: [owner.id],
    folder: "main",
  });

  const createRecipe = (
    title: string,
    ingredients: string,
    overrides: Partial<Prisma.RecipeUncheckedCreateInput> = {},
  ) =>
    prisma.recipe.create({
      data: { ...recipeFactory(owner.id), title, ingredients, ...overrides },
    });

  it("ranks recipes by how many of the provided ingredients they contain", async () => {
    await createRecipe("All three", "2 chicken breasts\n1 cup rice\n1 onion");
    await createRecipe("Two of three", "1 cup rice\n1 onion, diced");
    await createRecipe("One of three", "1 onion");
    await createRecipe("None", "1 cup flour\n2 eggs");

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["chicken", "rice", "onion"],
    });

    const titles = await Promise.all(
      ranked.map((entry) =>
        prisma.recipe
          .findUniqueOrThrow({ where: { id: entry.recipeId } })
          .then((recipe) => recipe.title),
      ),
    );

    expect(titles).toEqual(["All three", "Two of three", "One of three"]);
    expect(ranked[0].matchedTerms.sort()).toEqual(["chicken", "onion", "rice"]);
  });

  it("ranks recipes matching more of the provided ingredients first", async () => {
    await createRecipe(
      "Uses both",
      "2 chicken breasts\n4 cloves garlic\n1 onion\n1 tbsp oil\n1 tsp salt\n1 lemon",
    );
    await createRecipe("Uses one", "1 whole chicken");

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["chicken", "garlic"],
    });

    const titles = await Promise.all(
      ranked.map((entry) =>
        prisma.recipe
          .findUniqueOrThrow({ where: { id: entry.recipeId } })
          .then((recipe) => recipe.title),
      ),
    );

    expect(titles).toEqual(["Uses both", "Uses one"]);
  });

  it("breaks ties on match count by fewest missing ingredients", async () => {
    await createRecipe("Complete combo", "1 cup rice\n1 onion");
    await createRecipe(
      "Padded combo",
      "1 cup rice\n1 onion\n1 tbsp oil\n1 tsp salt",
    );

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["rice", "onion"],
    });

    const titles = await Promise.all(
      ranked.map((entry) =>
        prisma.recipe
          .findUniqueOrThrow({ where: { id: entry.recipeId } })
          .then((recipe) => recipe.title),
      ),
    );

    expect(titles).toEqual(["Complete combo", "Padded combo"]);
  });

  it("ignores header lines when counting a recipe's ingredients", async () => {
    await createRecipe(
      "Headered",
      "[For the sauce]\n1 cup rice\n1 onion\n[For serving]",
    );
    await createRecipe("Plain", "1 cup rice\n1 onion\n1 tbsp oil");

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["rice", "onion"],
    });

    const titles = await Promise.all(
      ranked.map((entry) =>
        prisma.recipe
          .findUniqueOrThrow({ where: { id: entry.recipeId } })
          .then((recipe) => recipe.title),
      ),
    );

    expect(titles).toEqual(["Headered", "Plain"]);
  });

  it("matches whole words only and is case/accent insensitive", async () => {
    await createRecipe("Rice bowl", "1 cup RICE");
    await createRecipe("Licorice candy", "200g licorice");
    await createRecipe("Jalapeno", "1 jalapeño");

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["rice", "jalapeno"],
    });

    const titles = new Set(
      await Promise.all(
        ranked.map((entry) =>
          prisma.recipe
            .findUniqueOrThrow({ where: { id: entry.recipeId } })
            .then((recipe) => recipe.title),
        ),
      ),
    );

    expect(titles.has("Rice bowl")).toBe(true);
    expect(titles.has("Jalapeno")).toBe(true);
    expect(titles.has("Licorice candy")).toBe(false);
  });

  it("returns an empty result when no ingredients are provided", async () => {
    await createRecipe("Something", "1 onion");

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["   ", ""],
    });

    expect(ranked).toEqual([]);
  });

  it("drops terms that fold to an empty query without erroring", async () => {
    await createRecipe("Onion soup", "1 onion");

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["onion", "&&&"],
    });

    expect(ranked).toHaveLength(1);
    expect(ranked[0].matchedTerms).toEqual(["onion"]);
  });

  it("respects the limit argument", async () => {
    await createRecipe("All three", "2 chicken breasts\n1 cup rice\n1 onion");
    await createRecipe("Two of three", "1 cup rice\n1 onion");
    await createRecipe("One of three", "1 onion");

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["chicken", "rice", "onion"],
      limit: 1,
    });

    expect(ranked).toHaveLength(1);
    const recipe = await prisma.recipe.findUniqueOrThrow({
      where: { id: ranked[0].recipeId },
    });
    expect(recipe.title).toEqual("All three");
  });

  it("does not include recipes owned by other users", async () => {
    const other = await prisma.user.create({ data: userFactory() });
    cleanupIds.push(other.id);
    await prisma.recipe.create({
      data: {
        ...recipeFactory(other.id),
        title: "Theirs",
        ingredients: "1 onion",
      },
    });

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["onion"],
    });

    expect(ranked).toEqual([]);
  });

  it("excludes recipes outside the requested folder", async () => {
    await createRecipe("Main onion", "1 onion");
    await createRecipe("Inbox onion", "1 onion", { folder: "inbox" });

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["onion"],
    });

    const titles = await Promise.all(
      ranked.map((entry) =>
        prisma.recipe
          .findUniqueOrThrow({ where: { id: entry.recipeId } })
          .then((recipe) => recipe.title),
      ),
    );

    expect(titles).toEqual(["Main onion"]);
  });

  it("matches multi-word terms only as an adjacent phrase", async () => {
    await createRecipe("Adjacent", "1 chicken breast");
    await createRecipe("Separated", "1 chicken thigh\n1 breast of lamb");

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["chicken breast"],
    });

    const titles = new Set(
      await Promise.all(
        ranked.map((entry) =>
          prisma.recipe
            .findUniqueOrThrow({ where: { id: entry.recipeId } })
            .then((recipe) => recipe.title),
        ),
      ),
    );

    expect(titles.has("Adjacent")).toBe(true);
    expect(titles.has("Separated")).toBe(false);
  });

  it("breaks ties in match count alphabetically by title", async () => {
    await createRecipe("Zebra stew", "1 onion");
    await createRecipe("Apple stew", "1 onion");

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["onion"],
    });

    const titles = await Promise.all(
      ranked.map((entry) =>
        prisma.recipe
          .findUniqueOrThrow({ where: { id: entry.recipeId } })
          .then((recipe) => recipe.title),
      ),
    );

    expect(titles).toEqual(["Apple stew", "Zebra stew"]);
  });

  it("deduplicates ingredient terms case-insensitively", async () => {
    await createRecipe("Onion soup", "1 onion");

    const ranked = await findRecipesByIngredients({
      constraints: ownerConstraints(),
      ingredients: ["onion", "Onion", "  onion  "],
    });

    expect(ranked).toHaveLength(1);
    expect(ranked[0].matchedTerms).toEqual(["onion"]);
  });
});
