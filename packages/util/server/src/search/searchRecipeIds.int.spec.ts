import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma, User } from "@recipesage/prisma";
import { searchRecipeIds } from "./searchRecipeIds";
import { userFactory, recipeFactory } from "../general/factories";

describe("searchRecipeIds", () => {
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

  const createRecipe = (title: string, overrides = {}) =>
    prisma.recipe.create({
      data: { ...recipeFactory(owner.id), title, ...overrides },
    });

  it("requires every token to match rather than any", async () => {
    const both = await createRecipe("Chickenzz soupzz");
    const onlyOne = await createRecipe("Wxyqq plate", {
      ingredients: "1 chickenzz breast",
    });

    const ids = await searchRecipeIds({
      constraints: ownerConstraints(),
      queryString: "chickenzz soupzz",
    });

    expect(ids).toContain(both.id);
    expect(ids).not.toContain(onlyOne.id);
  });

  it("matches on a token prefix", async () => {
    const match = await createRecipe("Chickenzz parmesan");

    const ids = await searchRecipeIds({
      constraints: ownerConstraints(),
      queryString: "chickenz",
    });

    expect(ids).toContain(match.id);
  });

  it("does not error on a query containing only punctuation", async () => {
    await createRecipe("Chickenzz parmesan");

    const ids = await searchRecipeIds({
      constraints: ownerConstraints(),
      queryString: "!!!",
    });

    expect(ids).toEqual([]);
  });

  it("strips punctuation from an otherwise valid query", async () => {
    const match = await createRecipe("Chickenzz parmesan");

    const ids = await searchRecipeIds({
      constraints: ownerConstraints(),
      queryString: "chickenzz!",
    });

    expect(ids).toEqual([match.id]);
  });

  it("returns nothing when nothing is visible", async () => {
    const stranger = await prisma.user.create({ data: userFactory() });
    cleanupIds.push(stranger.id);
    await prisma.recipe.create({
      data: { ...recipeFactory(stranger.id), title: "Chickenzz theirs" },
    });

    const ids = await searchRecipeIds({
      constraints: {
        sessionUserId: undefined,
        userIds: [stranger.id],
        folder: "main",
      },
      queryString: "chickenzz",
    });

    expect(ids).toEqual([]);
  });

  it("returns no more ids than the requested limit", async () => {
    await prisma.recipe.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        ...recipeFactory(owner.id),
        title: `Chickenzz ${index}`,
      })),
    });

    const ids = await searchRecipeIds({
      constraints: ownerConstraints(),
      queryString: "chickenzz",
      limit: 5,
    });

    expect(ids).toHaveLength(5);
  });

  it("does not return duplicate ids when a recipe matches both strategies", async () => {
    await createRecipe("Chickenzz parmesan");

    const ids = await searchRecipeIds({
      constraints: ownerConstraints(),
      queryString: "chickenzz",
    });

    expect(new Set(ids).size).toEqual(ids.length);
  });

  it("orders fuzzy title matches by closeness", async () => {
    const near = await createRecipe("Blueberryzz");
    const far = await createRecipe("Blueberryzz muffin tin recipe");

    const ids = await searchRecipeIds({
      constraints: ownerConstraints(),
      queryString: "bluberryzz",
    });

    expect(ids.indexOf(near.id)).toBeLessThan(ids.indexOf(far.id));
  });
});
