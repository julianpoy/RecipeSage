import { prisma } from "@recipesage/prisma";
import { recipeFactory, labelFactory } from "@recipesage/util/server/general";
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

describe("deleteRecipesByLabelIds", () => {
  describe("success", () => {
    test("deletes every recipe carrying the label", async ({ trpc, user }) => {
      const label = await prisma.label.create({ data: labelFactory(user.id) });
      const labelled = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      const unlabelled = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      await prisma.recipeLabel.create({
        data: { labelId: label.id, recipeId: labelled.id },
      });

      await trpc.recipes.deleteRecipesByLabelIds({ labelIds: [label.id] });

      expect(
        await prisma.recipe.findUnique({ where: { id: labelled.id } }),
      ).toEqual(null);
      expect(
        (await prisma.recipe.findUnique({ where: { id: unlabelled.id } }))?.id,
      ).toEqual(unlabelled.id);
    });

    test("removes images that are no longer attached to anything", async ({
      trpc,
      user,
    }) => {
      const label = await prisma.label.create({ data: labelFactory(user.id) });
      const image = await createImage(user.id, "by-label-hanging");
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      await prisma.recipeLabel.create({
        data: { labelId: label.id, recipeId: recipe.id },
      });
      await prisma.recipeImage.create({
        data: { recipeId: recipe.id, imageId: image.id, order: 0 },
      });

      await trpc.recipes.deleteRecipesByLabelIds({ labelIds: [label.id] });

      expect(
        await prisma.image.findUnique({ where: { id: image.id } }),
      ).toEqual(null);
    });

    test("keeps an image that is still attached to a surviving recipe", async ({
      trpc,
      user,
    }) => {
      const label = await prisma.label.create({ data: labelFactory(user.id) });
      const image = await createImage(user.id, "by-label-shared");
      const deleted = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      const kept = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      await prisma.recipeLabel.create({
        data: { labelId: label.id, recipeId: deleted.id },
      });
      await prisma.recipeImage.create({
        data: { recipeId: deleted.id, imageId: image.id, order: 0 },
      });
      await prisma.recipeImage.create({
        data: { recipeId: kept.id, imageId: image.id, order: 0 },
      });

      await trpc.recipes.deleteRecipesByLabelIds({ labelIds: [label.id] });

      expect(
        (await prisma.image.findUnique({ where: { id: image.id } }))?.id,
      ).toEqual(image.id);
    });
  });
});
