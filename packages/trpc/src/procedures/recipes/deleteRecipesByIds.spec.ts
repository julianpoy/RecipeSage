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

describe("deleteRecipesByIds", () => {
  beforeEach(() => {
    addBulkMock.mockReset();
    addBulkMock.mockResolvedValue([]);
  });

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

    test("enqueues the deleted recipes' images for deletion", async ({
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

      expect(addBulkMock).toHaveBeenCalledWith([
        expect.objectContaining({
          data: { imageIds: [image.id], imageOwnerUserId: user.id },
        }),
      ]);
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

  describe("error", () => {
    test("keeps the recipes when the image deletion cannot be enqueued", async ({
      trpc,
      user,
    }) => {
      const image = await createImage(user.id, "by-ids-rollback");
      const recipe = await prisma.recipe.create({
        data: recipeFactory(user.id),
      });
      await prisma.recipeImage.create({
        data: { recipeId: recipe.id, imageId: image.id, order: 0 },
      });
      addBulkMock.mockRejectedValue(new Error("Connection is closed"));

      await expect(
        trpc.recipes.deleteRecipesByIds({ ids: [recipe.id] }),
      ).rejects.toThrow();

      expect(
        (await prisma.recipe.findUnique({ where: { id: recipe.id } }))?.id,
      ).toEqual(recipe.id);
    });
  });
});
