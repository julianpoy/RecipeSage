import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { recipeFactory } from "@recipesage/util/server/general";
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

describe("deleteLabel", () => {
  beforeEach(() => {
    addBulkMock.mockReset();
    addBulkMock.mockResolvedValue([]);
  });

  describe("success", () => {
    test("deletes a label", async ({ trpc, user }) => {
      const label = await prisma.label.create({
        data: {
          userId: user.id,
          title: "eggs",
        },
      });

      await trpc.labels.deleteLabel({
        id: label.id,
      });

      const deletedLabel = await prisma.label.findUnique({
        where: { id: label.id },
      });
      expect(deletedLabel).toEqual(null);
    });

    test("deletes a label and any recipes attached to it", async ({
      trpc,
      user,
    }) => {
      const label = await prisma.label.create({
        data: {
          title: "eggs",
          userId: user.id,
          labelGroupId: null,
        },
      });

      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "boiled egg",
          recipeLabels: {
            createMany: {
              data: [{ labelId: label.id }],
            },
          },
          rating: faker.number.int({ min: 1, max: 5 }),
        },
      });

      await trpc.labels.deleteLabel({
        id: label.id,
        includeAttachedRecipes: true,
      });

      const deletedRecipe = await prisma.recipe.findUnique({
        where: { id: recipe.id },
      });
      expect(deletedRecipe).toEqual(null);
    });

    test("enqueues the attached recipes' images for deletion", async ({
      trpc,
      user,
    }) => {
      const { label, image } = await createLabelledRecipeWithImage(user.id);

      await trpc.labels.deleteLabel({
        id: label.id,
        includeAttachedRecipes: true,
      });

      expect(addBulkMock).toHaveBeenCalledWith([
        expect.objectContaining({
          data: { imageIds: [image.id], imageOwnerUserId: user.id },
        }),
      ]);
    });
  });

  describe("error", () => {
    test("keeps the label and its recipes when the image deletion cannot be enqueued", async ({
      trpc,
      user,
    }) => {
      const { label, recipe } = await createLabelledRecipeWithImage(user.id);
      addBulkMock.mockRejectedValue(new Error("Connection is closed"));

      await expect(
        trpc.labels.deleteLabel({
          id: label.id,
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

    test("throws when the label does not exist", async ({ trpc }) => {
      await expect(
        trpc.labels.deleteLabel({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow("Label not found");
    });
  });
});
