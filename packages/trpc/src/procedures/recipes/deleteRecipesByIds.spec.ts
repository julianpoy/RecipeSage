import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test } from "../../testutils";

const createImage = (userId: string, key: string) =>
  prisma.image.create({
    data: {
      userId,
      location: `https://example.com/${key}.jpg`,
      key,
      json: {},
    },
  });

describe("deleteRecipesByIds", () => {
  describe("success", () => {
    test("deletes the given recipes", async ({ trpc, user }) => {
      const recipeA = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      const recipeB = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });

      await trpc.recipes.deleteRecipesByIds({ ids: [recipeA.id, recipeB.id] });

      const remaining = await prisma.recipe.findMany({
        where: { id: { in: [recipeA.id, recipeB.id] } },
      });
      expect(remaining).toEqual([]);
    });

    test("removes images that are no longer attached to anything", async ({
      trpc,
      user,
    }) => {
      const image = await createImage(user.id, "by-ids-hanging");
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      await prisma.recipeImage.create({
        data: { recipeId: recipe.id, imageId: image.id, order: 0 },
      });

      await trpc.recipes.deleteRecipesByIds({ ids: [recipe.id] });

      const remainingImage = await prisma.image.findUnique({
        where: { id: image.id },
      });
      expect(remainingImage).toEqual(null);
    });

    test("keeps an image that is still attached to a surviving recipe", async ({
      trpc,
      user,
    }) => {
      const image = await createImage(user.id, "by-ids-shared");
      const deleted = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      const kept = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      await prisma.recipeImage.create({
        data: { recipeId: deleted.id, imageId: image.id, order: 0 },
      });
      await prisma.recipeImage.create({
        data: { recipeId: kept.id, imageId: image.id, order: 0 },
      });

      await trpc.recipes.deleteRecipesByIds({ ids: [deleted.id] });

      const remainingImage = await prisma.image.findUnique({
        where: { id: image.id },
      });
      expect(remainingImage?.id).toEqual(image.id);
    });

    test("does not delete another user's recipes", async ({ trpc, user2 }) => {
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user2.id),
      });

      await trpc.recipes.deleteRecipesByIds({ ids: [recipe.id] });

      const remaining = await prisma.recipe.findUnique({
        where: { id: recipe.id },
      });
      expect(remaining?.id).toEqual(recipe.id);
    });
  });
});
