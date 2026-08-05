import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma, User } from "@recipesage/prisma";
import { importStandardizedRecipes } from "./importStandardizedRecipes";
import { userFactory } from "../general/factories";

describe("importStandardizedRecipes", () => {
  let user: User;

  beforeEach(async () => {
    user = await prisma.user.create({ data: userFactory() });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  it("attaches each label to the recipe it was imported with", async () => {
    await importStandardizedRecipes(
      user.id,
      [
        {
          recipe: { title: "Alpha", ingredients: "1 cup flour" },
          labels: ["alphalabel"],
          images: [],
        },
        {
          recipe: { title: "Bravo", ingredients: "2 cups sugar" },
          labels: ["bravolabel"],
          images: [],
        },
        {
          recipe: { title: "Charlie", ingredients: "3 eggs" },
          labels: ["charlielabel"],
          images: [],
        },
      ],
      "en-us",
      undefined,
    );

    const recipes = await prisma.recipe.findMany({
      where: { userId: user.id },
      include: { recipeLabels: { include: { label: true } } },
    });

    const labelsByTitle = new Map(
      recipes.map((recipe) => [
        recipe.title,
        recipe.recipeLabels.map((recipeLabel) => recipeLabel.label.title),
      ]),
    );

    expect(labelsByTitle.get("Alpha")).toEqual(["alphalabel"]);
    expect(labelsByTitle.get("Bravo")).toEqual(["bravolabel"]);
    expect(labelsByTitle.get("Charlie")).toEqual(["charlielabel"]);
  });

  it("imports a label whose title collides with an Object prototype key", async () => {
    await importStandardizedRecipes(
      user.id,
      [
        {
          recipe: { title: "Prototype" },
          labels: ["__proto__", "constructor"],
          images: [],
        },
      ],
      "en-us",
      undefined,
    );

    const recipe = await prisma.recipe.findFirstOrThrow({
      where: { userId: user.id, title: "Prototype" },
      include: { recipeLabels: { include: { label: true } } },
    });

    expect(
      recipe.recipeLabels.map((recipeLabel) => recipeLabel.label.title).sort(),
    ).toEqual(["__proto__", "constructor"]);
  });

  it("skips a label title that cleans to nothing", async () => {
    await importStandardizedRecipes(
      user.id,
      [
        {
          recipe: { title: "Commas" },
          labels: [",,,", "   "],
          images: [],
        },
      ],
      "en-us",
      undefined,
    );

    const recipe = await prisma.recipe.findFirstOrThrow({
      where: { userId: user.id, title: "Commas" },
      include: { recipeLabels: true },
    });

    expect(recipe.recipeLabels).toEqual([]);
  });

  it("does not fail an import whose entry carries no rating", async () => {
    await importStandardizedRecipes(
      user.id,
      [
        {
          recipe: { title: "Unrated", rating: undefined },
          labels: [],
          images: [],
        },
      ],
      "en-us",
      undefined,
    );

    const recipe = await prisma.recipe.findFirst({
      where: { userId: user.id, title: "Unrated" },
    });

    expect(recipe?.rating).toBeNull();
  });
});
