import { trpcSetup, tearDown } from "./utils";
import { prisma } from "@recipesage/prisma";

describe("Recipes", () => {
  let user;
  let trpc;

  beforeAll(async () => {
    ({ user, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id);
  });

  it("creates a recipe", async () => {
    const recipe = await trpc.recipes.createRecipe.mutate({
      title: "Sliced cucumber",
      description: "Family recipe",
      yield: "1 portion",
      folder: "main",
      activeTime: "30 sec",
      totalTime: "3 hours",
      source: "my grandmother",
      url: "she doesn't have it",
      notes: "on the fridge",
      ingredients: "1 cucumber",
      instructions: "slice it",
      rating: 3,
      labelIds: [],
      imageIds: [],
    });

    expect(recipe.id).toMatch(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
    );
    expect(recipe.title).toEqual("Sliced cucumber");
    await prisma.recipe.delete({
      where: {
        id: recipe.id,
      },
    });
  });

  it("get recipes", async () => {
    const recipe = await prisma.recipe.create({
      data: {
        userId: user.id,
        title: "Sliced cucumber",
        description: "Family recipe",
        yield: "1 portion",
        folder: "main",
        activeTime: "30 sec",
        totalTime: "3 hours",
        source: "my grandmother",
        url: "she doesn't have it",
        notes: "on the fridge",
        ingredients: "1 cucumber",
        instructions: "slice it",
        rating: 3,
      },
    });

    const response = await trpc.recipes.getRecipes.query({
      limit: 3,
      folder: "main",
      orderBy: "title",
      orderDirection: "asc",
      offset: 0,
    });

    expect(response.recipes[0].id).toMatch(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
    );
    expect(response.recipes[0].title).toEqual("Sliced cucumber");
    await prisma.recipe.delete({
      where: {
        id: recipe.id,
      },
    });
  });

  it("delete recipes", async () => {
    const recipe = await prisma.recipe.create({
      data: {
        userId: user.id,
        title: "Sliced cucumber",
        description: "Family recipe",
        yield: "1 portion",
        folder: "main",
        activeTime: "30 sec",
        totalTime: "3 hours",
        source: "my grandmother",
        url: "she doesn't have it",
        notes: "on the fridge",
        ingredients: "1 cucumber",
        instructions: "slice it",
        rating: 3,
      },
    });

    const response = await trpc.recipes.deleteRecipe.mutate({
      id: recipe.id,
    });

    expect(response).toEqual("Ok");

    const response2 = await prisma.recipe.findUnique({
      where: {
        id: recipe.id,
      },
    });
    expect(response2).toEqual(null);
  });
});
