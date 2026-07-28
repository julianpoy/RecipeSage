import { prisma, Prisma } from "@recipesage/prisma";
import {
  recipeFactory,
  friendshipFactory,
  profileItemFactory,
  labelFactory,
} from "@recipesage/util/server/general";
import {
  SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERM_LENGTH,
  SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS,
} from "@recipesage/util/shared";
import { test, anonymousTrpc } from "../../testutils";

const createRecipe = (
  userId: string,
  title: string,
  ingredients: string,
  overrides: Partial<Prisma.RecipeUncheckedCreateInput> = {},
) =>
  prisma.recipe.create({
    data: { ...recipeFactory(userId), title, ingredients, ...overrides },
  });

describe("searchRecipesByIngredients", () => {
  test("ranks the user's recipes by matched ingredient count", async ({
    user,
    trpc,
  }) => {
    await createRecipe(
      user.id,
      "All three",
      "2 chicken breasts\n1 cup rice\n1 onion",
    );
    await createRecipe(user.id, "Two of three", "1 cup rice\n1 onion");
    await createRecipe(user.id, "One of three", "1 onion");
    await createRecipe(user.id, "None", "1 cup flour");

    const response = await trpc.recipes.searchRecipesByIngredients({
      ingredients: ["chicken", "rice", "onion"],
    });

    expect(response.results.map((result) => result.recipe.title)).toEqual([
      "All three",
      "Two of three",
      "One of three",
    ]);
    expect(response.results[0].matchedTerms.sort()).toEqual([
      "chicken",
      "onion",
      "rice",
    ]);
    expect(response.results[1].matchedTerms.sort()).toEqual(["onion", "rice"]);
    expect(response.results[2].matchedTerms).toEqual(["onion"]);
  });

  test("ranks a recipe using more of the ingredients above a smaller partial match", async ({
    user,
    trpc,
  }) => {
    await createRecipe(
      user.id,
      "Uses both",
      "2 chicken breasts\n4 cloves garlic\n1 onion\n1 tbsp oil\n1 tsp salt\n1 lemon",
    );
    await createRecipe(user.id, "Uses one", "1 whole chicken");

    const response = await trpc.recipes.searchRecipesByIngredients({
      ingredients: ["chicken", "garlic"],
    });

    expect(response.results.map((result) => result.recipe.title)).toEqual([
      "Uses both",
      "Uses one",
    ]);
  });

  test("does not return another user's recipes by default", async ({
    user2,
    trpc,
  }) => {
    await createRecipe(user2.id, "Theirs", "1 onion");

    const response = await trpc.recipes.searchRecipesByIngredients({
      ingredients: ["onion"],
    });

    expect(response.results).toEqual([]);
  });

  test("includes mutual friends' shared recipes when includeAllFriends is set", async ({
    user,
    user2,
    trpc,
  }) => {
    await prisma.friendship.createMany({
      data: friendshipFactory(user.id, user2.id),
    });
    await prisma.profileItem.create({
      data: profileItemFactory({
        userId: user2.id,
        type: "all-recipes",
        visibility: "friends-only",
      }),
    });
    await createRecipe(user2.id, "Friend recipe", "1 onion");

    const withoutFriends = await trpc.recipes.searchRecipesByIngredients({
      ingredients: ["onion"],
    });
    expect(withoutFriends.results).toEqual([]);

    const withFriends = await trpc.recipes.searchRecipesByIngredients({
      ingredients: ["onion"],
      includeAllFriends: true,
    });
    expect(withFriends.results.map((result) => result.recipe.title)).toEqual([
      "Friend recipe",
    ]);
  });

  test("searches explicit userIds of a public sharer without a session", async ({
    user2,
  }) => {
    await prisma.profileItem.create({
      data: profileItemFactory({
        userId: user2.id,
        type: "all-recipes",
        visibility: "public",
      }),
    });
    await createRecipe(user2.id, "Public onion", "1 onion");

    const response = await anonymousTrpc.recipes.searchRecipesByIngredients({
      ingredients: ["onion"],
      userIds: [user2.id],
    });

    expect(response.results.map((result) => result.recipe.title)).toEqual([
      "Public onion",
    ]);
  });

  test("rejects when neither a session nor userIds is provided", async () => {
    await expect(
      anonymousTrpc.recipes.searchRecipesByIngredients({
        ingredients: ["onion"],
      }),
    ).rejects.toThrow();
  });

  test("excludes a friend's unshared recipes even with includeAllFriends", async ({
    user,
    user2,
    trpc,
  }) => {
    await prisma.friendship.createMany({
      data: friendshipFactory(user.id, user2.id),
    });
    await createRecipe(user2.id, "Unshared", "1 onion");

    const response = await trpc.recipes.searchRecipesByIngredients({
      ingredients: ["onion"],
      includeAllFriends: true,
    });

    expect(response.results).toEqual([]);
  });

  test("returns a friend's shared recipe ranked below more of their unshared ones", async ({
    user,
    user2,
    trpc,
  }) => {
    await prisma.friendship.createMany({
      data: friendshipFactory(user.id, user2.id),
    });

    const label = await prisma.label.create({
      data: labelFactory(user2.id),
    });
    await prisma.profileItem.create({
      data: profileItemFactory({
        userId: user2.id,
        type: "label",
        labelId: label.id,
        visibility: "friends-only",
      }),
    });

    await prisma.recipe.createMany({
      data: Array.from({ length: 120 }, (_, index) => ({
        ...recipeFactory(user2.id),
        title: `Unshared ${index}`,
        ingredients: "1 onion\n1 cup rice",
      })),
    });

    const shared = await createRecipe(user2.id, "Shared", "1 onion");
    await prisma.recipeLabel.create({
      data: { recipeId: shared.id, labelId: label.id },
    });

    const response = await trpc.recipes.searchRecipesByIngredients({
      ingredients: ["onion", "rice"],
      includeAllFriends: true,
    });

    expect(response.results.map((result) => result.recipe.title)).toEqual([
      "Shared",
    ]);
  });

  test("rejects an empty ingredients array", async ({ trpc }) => {
    await expect(
      trpc.recipes.searchRecipesByIngredients({ ingredients: [] }),
    ).rejects.toThrow();
  });

  test("accepts exactly the maximum number of ingredients", async ({
    trpc,
  }) => {
    const ingredients = Array.from(
      { length: SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS },
      (_, index) => `ingredient${index}`,
    );

    const response = await trpc.recipes.searchRecipesByIngredients({
      ingredients,
    });

    expect(response.results).toEqual([]);
  });

  test("rejects more than the maximum number of ingredients", async ({
    trpc,
  }) => {
    const ingredients = Array.from(
      { length: SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS + 1 },
      (_, index) => `ingredient${index}`,
    );

    await expect(
      trpc.recipes.searchRecipesByIngredients({ ingredients }),
    ).rejects.toThrow();
  });

  test("rejects a blank ingredient", async ({ trpc }) => {
    await expect(
      trpc.recipes.searchRecipesByIngredients({ ingredients: ["   "] }),
    ).rejects.toThrow();
  });

  test("rejects an ingredient longer than the maximum term length", async ({
    trpc,
  }) => {
    await expect(
      trpc.recipes.searchRecipesByIngredients({
        ingredients: [
          "a".repeat(SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERM_LENGTH + 1),
        ],
      }),
    ).rejects.toThrow();
  });

  test("trims surrounding whitespace from ingredients", async ({
    user,
    trpc,
  }) => {
    await createRecipe(user.id, "Onion soup", "1 onion\n2 cups stock");

    const response = await trpc.recipes.searchRecipesByIngredients({
      ingredients: ["  onion  "],
    });

    expect(response.results.map((result) => result.recipe.title)).toEqual([
      "Onion soup",
    ]);
    expect(response.results[0].matchedTerms).toEqual(["onion"]);
  });
});
