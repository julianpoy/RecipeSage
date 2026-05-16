import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { recipeFactory } from "@recipesage/util/server/general";
import { test } from "../../testutils";

describe("deleteLabel", () => {
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
  });

  describe("error", () => {
    test("throws when the label does not exist", async ({ trpc }) => {
      await expect(
        trpc.labels.deleteLabel({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow("Label not found");
    });
  });
});
