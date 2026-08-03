import { prisma } from "@recipesage/prisma";
import {
  recipeFactory,
  discoverRecipeFactory,
} from "@recipesage/util/server/general";
import { test } from "../../testutils";

describe("deleteAllRecipes", () => {
  describe("success", () => {
    test("deletes the caller's recipes", async ({ trpc, user }) => {
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });

      await trpc.recipes.deleteAllRecipes();

      const deleted = await prisma.recipe.findUnique({
        where: { id: recipe.id },
      });
      expect(deleted).toBeNull();
    });

    test("keeps images that are still used by a discover recipe", async ({
      trpc,
      user,
    }) => {
      const image = await prisma.image.create({
        data: {
          userId: user.id,
          location: "https://example.com/image.jpg",
          key: "example-key",
          json: {},
        },
      });
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      await prisma.recipeImage.create({
        data: {
          recipeId: recipe.id,
          imageId: image.id,
          order: 0,
        },
      });
      const discoverRecipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      await prisma.discoverRecipeImage.create({
        data: {
          discoverRecipeId: discoverRecipe.id,
          imageId: image.id,
          order: 0,
        },
      });

      await trpc.recipes.deleteAllRecipes();

      const remainingImage = await prisma.image.findUnique({
        where: { id: image.id },
      });
      expect(remainingImage?.id).toEqual(image.id);

      const remainingDiscoverImages = await prisma.discoverRecipeImage.findMany(
        {
          where: { discoverRecipeId: discoverRecipe.id },
        },
      );
      expect(remainingDiscoverImages).toHaveLength(1);
    });

    test("deletes images that are no longer used", async ({ trpc, user }) => {
      const image = await prisma.image.create({
        data: {
          userId: user.id,
          location: "https://example.com/image.jpg",
          key: "example-key",
          json: {},
        },
      });
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      await prisma.recipeImage.create({
        data: {
          recipeId: recipe.id,
          imageId: image.id,
          order: 0,
        },
      });

      await trpc.recipes.deleteAllRecipes();

      const deletedImage = await prisma.image.findUnique({
        where: { id: image.id },
      });
      expect(deletedImage).toBeNull();
    });
  });
});
