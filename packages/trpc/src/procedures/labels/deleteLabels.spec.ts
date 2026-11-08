import { prisma } from "@recipesage/prisma";
import { test, createLabelledRecipeWithImage } from "../../testutils";

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

describe("deleteLabels", () => {
  beforeEach(() => {
    addBulkMock.mockReset();
    addBulkMock.mockResolvedValue([]);
  });

  describe("success", () => {
    test("deletes the labels and keeps their recipes", async ({
      trpc,
      user,
    }) => {
      const { label, recipe } = await createLabelledRecipeWithImage(user.id);

      await trpc.labels.deleteLabels({ ids: [label.id] });

      expect(
        await prisma.label.findUnique({ where: { id: label.id } }),
      ).toBeNull();
      expect(
        (await prisma.recipe.findUnique({ where: { id: recipe.id } }))?.id,
      ).toEqual(recipe.id);
    });

    test("deletes the attached recipes and enqueues their images for deletion", async ({
      trpc,
      user,
    }) => {
      const { label, image, recipe } = await createLabelledRecipeWithImage(
        user.id,
      );

      await trpc.labels.deleteLabels({
        ids: [label.id],
        includeAttachedRecipes: true,
      });

      expect(
        await prisma.recipe.findUnique({ where: { id: recipe.id } }),
      ).toBeNull();
      expect(addBulkMock).toHaveBeenCalledWith([
        expect.objectContaining({
          data: { imageIds: [image.id], imageOwnerUserId: user.id },
        }),
      ]);
    });
  });

  describe("error", () => {
    test("keeps the labels and their recipes when the image deletion cannot be enqueued", async ({
      trpc,
      user,
    }) => {
      const { label, recipe } = await createLabelledRecipeWithImage(user.id);
      addBulkMock.mockRejectedValue(new Error("Connection is closed"));

      await expect(
        trpc.labels.deleteLabels({
          ids: [label.id],
          includeAttachedRecipes: true,
        }),
      ).rejects.toThrow();

      expect(
        (await prisma.label.findUnique({ where: { id: label.id } }))?.id,
      ).toEqual(label.id);
      expect(
        (await prisma.recipe.findUnique({ where: { id: recipe.id } }))?.id,
      ).toEqual(recipe.id);
    });
  });
});
