import { prisma, Prisma } from "@recipesage/prisma";
import {
  recipeFactory,
  labelFactory,
  friendshipFactory,
  profileItemFactory,
} from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

const createRecipe = (
  userId: string,
  overrides: Partial<Prisma.RecipeUncheckedCreateInput> = {},
) =>
  prisma.recipe.create({
    data: { ...recipeFactory(userId), ...overrides },
  });

describe("searchRecipes", () => {
  test("matches a term in the title and excludes non-matching recipes", async ({
    user,
    trpc,
  }) => {
    const match = await createRecipe(user.id, { title: "Roasted chickenzz" });
    await createRecipe(user.id, { title: "Beefzz bowl" });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "chickenzz",
      folder: "main",
    });

    expect(response.recipes.map((r) => r.id)).toEqual([match.id]);
    expect(response.totalCount).toBe(1);
  });

  test("matches a term that only appears in the ingredients", async ({
    user,
    trpc,
  }) => {
    const match = await createRecipe(user.id, {
      title: "Plain bowl",
      ingredients: "1 cup basmatizz rice",
    });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "basmatizz",
      folder: "main",
    });

    expect(response.recipes.map((r) => r.id)).toEqual([match.id]);
  });

  test("matches a term that only appears in the notes", async ({
    user,
    trpc,
  }) => {
    const match = await createRecipe(user.id, {
      title: "Plain bowl",
      notes: "Best with saffronzz",
    });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "saffronzz",
      folder: "main",
    });

    expect(response.recipes.map((r) => r.id)).toEqual([match.id]);
  });

  test("matches a term that only appears in the description", async ({
    user,
    trpc,
  }) => {
    const match = await createRecipe(user.id, {
      title: "Plain bowl",
      description: "A hearty pilafzz",
    });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "pilafzz",
      folder: "main",
    });

    expect(response.recipes.map((r) => r.id)).toEqual([match.id]);
  });

  test("matches a term that only appears in the source", async ({
    user,
    trpc,
  }) => {
    const match = await createRecipe(user.id, {
      title: "Plain bowl",
      source: "Grandmazz cookbook",
    });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "grandmazz",
      folder: "main",
    });

    expect(response.recipes.map((r) => r.id)).toEqual([match.id]);
  });

  test("does not match a term that only appears in the instructions", async ({
    user,
    trpc,
  }) => {
    await createRecipe(user.id, {
      title: "Plain bowl",
      instructions: "Simmer the broth until reducedzz",
    });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "reducedzz",
      folder: "main",
    });

    expect(response.recipes).toEqual([]);
    expect(response.totalCount).toBe(0);
  });

  test("folds accents so an unaccented term matches accented content", async ({
    user,
    trpc,
  }) => {
    const match = await createRecipe(user.id, {
      title: "Zoequux Bowl",
      ingredients: "1 fresh Jalapeñozz",
    });

    const unaccented = await trpc.recipes.searchRecipes({
      searchTerm: "jalapenozz",
      folder: "main",
    });
    expect(unaccented.recipes.map((r) => r.id)).toEqual([match.id]);

    const accented = await trpc.recipes.searchRecipes({
      searchTerm: "jalapeñozz",
      folder: "main",
    });
    expect(accented.recipes.map((r) => r.id)).toEqual([match.id]);
  });

  test("ranks a title match above an ingredients-only match", async ({
    user,
    trpc,
  }) => {
    const ingredientMatch = await createRecipe(user.id, {
      title: "Plain stew",
      ingredients: "1 tbsp paprikazz",
    });
    const titleMatch = await createRecipe(user.id, {
      title: "Paprikazz stew",
      ingredients: "1 onion",
    });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "paprikazz",
      folder: "main",
    });

    expect(response.recipes.map((r) => r.id)).toEqual([
      titleMatch.id,
      ingredientMatch.id,
    ]);
  });

  test("matches a fuzzy (mistyped) title the full-text index would miss", async ({
    user,
    trpc,
  }) => {
    const match = await createRecipe(user.id, { title: "Blueberryzz Muffins" });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "bluberryzz",
      folder: "main",
    });

    expect(response.recipes.map((r) => r.id)).toEqual([match.id]);
  });

  test("only searches the requested folder", async ({ user, trpc }) => {
    const inboxRecipe = await createRecipe(user.id, {
      title: "Inboxzz soup",
      folder: "inbox",
    });

    const inMain = await trpc.recipes.searchRecipes({
      searchTerm: "inboxzz",
      folder: "main",
    });
    expect(inMain.recipes).toEqual([]);

    const inInbox = await trpc.recipes.searchRecipes({
      searchTerm: "inboxzz",
      folder: "inbox",
    });
    expect(inInbox.recipes.map((r) => r.id)).toEqual([inboxRecipe.id]);
  });

  test("returns nothing for a whitespace-only search term", async ({
    user,
    trpc,
  }) => {
    await createRecipe(user.id, { title: "Somethingzz" });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: " ",
      folder: "main",
    });

    expect(response.recipes).toEqual([]);
  });

  test("filters results to a given label", async ({ user, trpc }) => {
    const label = await prisma.label.create({
      data: { ...labelFactory(user.id), title: "dinnerzz" },
    });
    const labeled = await createRecipe(user.id, {
      title: "Curryzz",
      recipeLabels: { create: [{ labelId: label.id }] },
    });
    await createRecipe(user.id, { title: "Curryzz two" });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "curryzz",
      folder: "main",
      labels: ["dinnerzz"],
    });

    expect(response.recipes.map((r) => r.id)).toEqual([labeled.id]);
  });

  test("finds a labeled match that ranks below a full page of unlabeled ones", async ({
    user,
    trpc,
  }) => {
    const label = await prisma.label.create({
      data: { ...labelFactory(user.id), title: "keepzz" },
    });

    await prisma.recipe.createMany({
      data: Array.from({ length: 1200 }, (_, index) => ({
        ...recipeFactory(user.id),
        title: `Onionzz filler ${index}`,
      })),
    });

    const labeled = await createRecipe(user.id, {
      title: "Zzz target",
      notes: "onionzz",
      recipeLabels: { create: [{ labelId: label.id }] },
    });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "onionzz",
      folder: "main",
      labels: ["keepzz"],
    });

    expect(response.recipes.map((r) => r.id)).toEqual([labeled.id]);
  });

  test("requires all labels when labelIntersection is set", async ({
    user,
    trpc,
  }) => {
    const labelX = await prisma.label.create({
      data: { ...labelFactory(user.id), title: "xzz" },
    });
    const labelY = await prisma.label.create({
      data: { ...labelFactory(user.id), title: "yzz" },
    });
    const both = await createRecipe(user.id, {
      title: "Tacozz",
      recipeLabels: {
        create: [{ labelId: labelX.id }, { labelId: labelY.id }],
      },
    });
    await createRecipe(user.id, {
      title: "Tacozz two",
      recipeLabels: { create: [{ labelId: labelX.id }] },
    });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "tacozz",
      folder: "main",
      labels: ["xzz", "yzz"],
      labelIntersection: true,
    });

    expect(response.recipes.map((r) => r.id)).toEqual([both.id]);
  });

  test("filters by rating", async ({ user, trpc }) => {
    const fiveStar = await createRecipe(user.id, {
      title: "Ramenzz",
      rating: 5,
    });
    await createRecipe(user.id, { title: "Ramenzz two", rating: 3 });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "ramenzz",
      folder: "main",
      ratings: [5],
    });

    expect(response.recipes.map((r) => r.id)).toEqual([fiveStar.id]);
  });

  test("filters by a nutrition range", async ({ user, trpc }) => {
    const lowCal = await createRecipe(user.id, {
      title: "Saladzz",
      nutritionCalories: 150,
    });
    await createRecipe(user.id, {
      title: "Saladzz two",
      nutritionCalories: 900,
    });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "saladzz",
      folder: "main",
      nutritionFilter: { calories: { min: 0, max: 400 } },
    });

    expect(response.recipes.map((r) => r.id)).toEqual([lowCal.id]);
  });

  test("does not return another user's recipes by default", async ({
    user2,
    trpc,
  }) => {
    await createRecipe(user2.id, { title: "Theirszz recipe" });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "theirszz",
      folder: "main",
    });

    expect(response.recipes).toEqual([]);
  });

  test("includes a friend's shared recipes only when includeAllFriends is set", async ({
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
    const friendRecipe = await createRecipe(user2.id, {
      title: "Friendzz gumbo",
    });

    const withoutFriends = await trpc.recipes.searchRecipes({
      searchTerm: "friendzz",
      folder: "main",
    });
    expect(withoutFriends.recipes).toEqual([]);

    const withFriends = await trpc.recipes.searchRecipes({
      searchTerm: "friendzz",
      folder: "main",
      includeAllFriends: true,
    });
    expect(withFriends.recipes.map((r) => r.id)).toEqual([friendRecipe.id]);
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
    const publicRecipe = await createRecipe(user2.id, {
      title: "Publiczz pie",
    });

    const response = await anonymousTrpc.recipes.searchRecipes({
      searchTerm: "publiczz",
      folder: "main",
      userIds: [user2.id],
    });

    expect(response.recipes.map((r) => r.id)).toEqual([publicRecipe.id]);
  });

  test("rejects when neither a session nor userIds is provided", async () => {
    await expect(
      anonymousTrpc.recipes.searchRecipes({
        searchTerm: "anything",
        folder: "main",
      }),
    ).rejects.toThrow();
  });

  test("returns an empty result when nothing matches", async ({
    user,
    trpc,
  }) => {
    await createRecipe(user.id, { title: "Waffleszz" });

    const response = await trpc.recipes.searchRecipes({
      searchTerm: "nonexistentzz",
      folder: "main",
    });

    expect(response.recipes).toEqual([]);
    expect(response.totalCount).toBe(0);
  });
});
