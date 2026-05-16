import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test } from "../../testutils";

describe("deleteRecipe", () => {
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
  });

  describe("error", () => {
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
