import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { recipeFactory } from "../../factories/recipeFactory";

describe("updateRecipe", () => {
  let user: User;
  let user2: User;
  let trpc: CreateTRPCProxyClient<AppRouter>;

  beforeAll(async () => {
    ({ user, user2, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("updates the recipe", async () => {
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Mexican chicken",
        },
      });
      const response = await trpc.recipes.updateRecipe.mutate({
        ...recipeFactory(user.id),
        title: "marmelad",
        id: recipe.id,
        labelIds: [],
        imageIds: [],
        folder: "main",
      });
      expect(response.title).toEqual("marmelad");

      const updatedRecipe = await prisma.recipe.findUnique({
        where: {
          id: recipe.id,
        },
      });
      expect(updatedRecipe?.title).toEqual("marmelad");
    });

    it("allows to update recipe with image", async () => {
      const image = await prisma.image.create({
        data: {
          location: "somehosting.com/1",
          userId: user.id,
          key: "someKey",
          json: {},
        },
      });

      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
        },
      });
      await trpc.recipes.updateRecipe.mutate({
        ...recipeFactory(user.id),
        id: recipe.id,
        labelIds: [],
        imageIds: [image.id],
        folder: "main",
      });

      const recipeImage = await prisma.recipeImage.findFirst({
        where: {
          recipeId: recipe.id,
        },
      });
      expect(typeof recipeImage?.id).toBe("string");
    });
  });
  describe("error", () => {
    it("throws an error when updating a recipe that does not exist", async () => {
      return expect(async () => {
        await trpc.recipes.updateRecipe.mutate({
          ...recipeFactory(user.id),
          title: "marmelad",
          labelIds: [],
          imageIds: [],
          folder: "main",
          id: "00000000-0c70-4718-aacc-05add19096b5",
        });
      }).rejects.toThrow("Recipe not found");
    });
  });
  it("fails to update a recipe with differrent user", async () => {
    const { user: user2 } = await trpcSetup();
    const recipe = await prisma.recipe.create({
      data: {
        ...recipeFactory(user2.id),
        title: "salad",
      },
    });

    await expect(async () => {
      await trpc.recipes.updateRecipe.mutate({
        ...recipeFactory(user.id),
        title: "salad",
        labelIds: [],
        imageIds: [],
        folder: "main",
        id: recipe.id,
      });
    }).rejects.toThrow("Recipe not found");
  });
  it("throws an error when updating a recipe with label ids the user does not own", async () => {
    const { user: user2 } = await trpcSetup();

    const recipe = await prisma.recipe.create({
      data: {
        ...recipeFactory(user.id),
      },
    });

    const label = await prisma.label.create({
      data: {
        title: "salads",
        userId: user2.id,
        labelGroupId: null,
      },
    });

    await expect(async () => {
      await trpc.recipes.updateRecipe.mutate({
        ...recipeFactory(user.id),
        title: "salads",
        labelIds: [label.id],
        imageIds: [],
        folder: "main",
        id: recipe.id,
      });
    }).rejects.toThrow("You do not own one of the specified label ids");
  });
});
