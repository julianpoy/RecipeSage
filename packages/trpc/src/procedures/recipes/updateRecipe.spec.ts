import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test } from "../../testutils";

describe("updateRecipe", () => {
  describe("success", () => {
    test("updates the recipe's title", async ({ trpc, user }) => {
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Mexican chicken",
        },
      });

      await trpc.recipes.updateRecipe({
        ...recipeFactory(user.id),
        title: "marmalade",
        id: recipe.id,
        labelIds: [],
        imageIds: [],
        folder: "main",
      });

      const updatedRecipe = await prisma.recipe.findUnique({
        where: { id: recipe.id },
      });
      expect(updatedRecipe?.title).toEqual("marmalade");
    });

    test("clears a populated nutrition field when set to null", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          nutritionCalories: 250,
        },
      });

      await trpc.recipes.updateRecipe({
        ...recipeFactory(user.id),
        id: recipe.id,
        labelIds: [],
        imageIds: [],
        folder: "main",
        nutritionCalories: null,
      });

      const updatedRecipe = await prisma.recipe.findUnique({
        where: { id: recipe.id },
      });
      expect(updatedRecipe?.nutritionCalories).toBeNull();
    });

    test("attaches an image to the recipe", async ({ trpc, user }) => {
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

      await trpc.recipes.updateRecipe({
        ...recipeFactory(user.id),
        id: recipe.id,
        labelIds: [],
        imageIds: [image.id],
        folder: "main",
      });

      const recipeImage = await prisma.recipeImage.findFirst({
        where: { recipeId: recipe.id },
      });
      expect(recipeImage?.imageId).toEqual(image.id);
    });
  });

  describe("error", () => {
    test("throws when the recipe does not exist", async ({ trpc, user }) => {
      await expect(
        trpc.recipes.updateRecipe({
          ...recipeFactory(user.id),
          title: "marmalade",
          labelIds: [],
          imageIds: [],
          folder: "main",
          id: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow("Recipe not found");
    });

    test("throws when the recipe belongs to another user", async ({
      trpc,
      user,
      user2,
    }) => {
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user2.id),
          title: "salad",
        },
      });

      await expect(
        trpc.recipes.updateRecipe({
          ...recipeFactory(user.id),
          title: "salad",
          labelIds: [],
          imageIds: [],
          folder: "main",
          id: recipe.id,
        }),
      ).rejects.toThrow("Recipe not found");
    });

    test("throws when a label id belongs to another user", async ({
      trpc,
      user,
      user2,
    }) => {
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

      await expect(
        trpc.recipes.updateRecipe({
          ...recipeFactory(user.id),
          title: "salads",
          labelIds: [label.id],
          imageIds: [],
          folder: "main",
          id: recipe.id,
        }),
      ).rejects.toThrow("You do not own one of the specified label ids");
    });
  });
});
