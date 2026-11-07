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

const { addBulkMock } = vi.hoisted(() => ({
  addBulkMock: vi.fn(),
}));

vi.mock("bullmq", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Queue: class {
    addBulk = addBulkMock;
    on = vi.fn();
  },
}));

describe("deleteRecipesByLabelIds", () => {
  beforeEach(() => {
    addBulkMock.mockReset();
    addBulkMock.mockResolvedValue([]);
  });

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

    test("enqueues the deleted recipes' images for deletion", async ({
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

      expect(addBulkMock).toHaveBeenCalledWith([
        expect.objectContaining({
          data: { imageIds: [image.id], imageOwnerUserId: user.id },
        }),
      ]);
    });
  });

  describe("error", () => {
    test("keeps the recipes when the image deletion cannot be enqueued", async ({
      trpc,
      user,
    }) => {
      const label = await prisma.label.create({ data: labelFactory(user.id) });
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      const image = await createImage(user.id, "by-label-rollback");
      await prisma.recipeLabel.create({
        data: { labelId: label.id, recipeId: recipe.id },
      });
      await prisma.recipeImage.create({
        data: { recipeId: recipe.id, imageId: image.id, order: 0 },
      });
      addBulkMock.mockRejectedValue(new Error("Connection is closed"));

      await expect(
        trpc.recipes.deleteRecipesByLabelIds({ labelIds: [label.id] }),
      ).rejects.toThrow();

      expect(
        (await prisma.recipe.findUnique({ where: { id: recipe.id } }))?.id,
      ).toEqual(recipe.id);
    });
  });
});
