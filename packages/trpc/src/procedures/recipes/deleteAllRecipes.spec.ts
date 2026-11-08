import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test, createRecipeWithImage } from "../../testutils";

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

describe("deleteAllRecipes", () => {
  beforeEach(() => {
    addBulkMock.mockReset();
    addBulkMock.mockResolvedValue([]);
  });

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

    test("enqueues the caller's images for deletion", async ({
      trpc,
      user,
    }) => {
      const { image } = await createRecipeWithImage(user.id);

      await trpc.recipes.deleteAllRecipes();

      expect(addBulkMock).toHaveBeenCalledWith([
        expect.objectContaining({
          data: { imageIds: [image.id], imageOwnerUserId: user.id },
        }),
      ]);
    });

    test("does not enqueue images that are still in use", async ({
      trpc,
      user,
    }) => {
      const { image } = await createRecipeWithImage(user.id);
      const profileImage = await prisma.image.create({
        data: {
          userId: user.id,
          location: "https://example.com/image.jpg",
          key: "profile-image-key",
          json: {},
        },
      });
      await prisma.userProfileImage.create({
        data: { userId: user.id, imageId: profileImage.id, order: 0 },
      });

      await trpc.recipes.deleteAllRecipes();

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
      const { recipe } = await createRecipeWithImage(user.id);
      addBulkMock.mockRejectedValue(new Error("Connection is closed"));

      await expect(trpc.recipes.deleteAllRecipes()).rejects.toThrow();

      expect(
        (await prisma.recipe.findUnique({ where: { id: recipe.id } }))?.id,
      ).toEqual(recipe.id);
    });
  });
});
