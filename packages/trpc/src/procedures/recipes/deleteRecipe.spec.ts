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

describe("deleteRecipe", () => {
  beforeEach(() => {
    addBulkMock.mockReset();
    addBulkMock.mockResolvedValue([]);
  });

  describe("success", () => {
    test("deletes a recipe", async ({ trpc, user }) => {
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          folder: "inbox",
        },
      });

      await trpc.recipes.deleteRecipe({
        id: recipe.id,
      });

      const deletedRecipe = await prisma.recipe.findUnique({
        where: { id: recipe.id },
      });
      expect(deletedRecipe).toEqual(null);
    });

    test("enqueues the recipe's images for deletion", async ({
      trpc,
      user,
    }) => {
      const { image, recipe } = await createRecipeWithImage(user.id);

      await trpc.recipes.deleteRecipe({ id: recipe.id });

      expect(addBulkMock).toHaveBeenCalledWith([
        expect.objectContaining({
          data: { imageIds: [image.id], imageOwnerUserId: user.id },
        }),
      ]);
    });
  });

  describe("error", () => {
    test("keeps the recipe when the image deletion cannot be enqueued", async ({
      trpc,
      user,
    }) => {
      const { recipe } = await createRecipeWithImage(user.id);
      addBulkMock.mockRejectedValue(new Error("Connection is closed"));

      await expect(
        trpc.recipes.deleteRecipe({ id: recipe.id }),
      ).rejects.toThrow();

      expect(
        (await prisma.recipe.findUnique({ where: { id: recipe.id } }))?.id,
      ).toEqual(recipe.id);
    });

    test("throws when the recipe does not exist", async ({ trpc }) => {
      await expect(
        trpc.recipes.deleteRecipe({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow("Recipe not found");
    });

    test("throws when the recipe belongs to another user", async ({
      trpc,
      user2,
    }) => {
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user2.id),
          folder: "inbox",
        },
      });

      await expect(
        trpc.recipes.deleteRecipe({
          id: recipe.id,
        }),
      ).rejects.toThrow("Recipe not found");
    });
  });
});
