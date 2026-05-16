import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test } from "../../testutils";

describe("getRecipe", () => {
  describe("success", () => {
    test("returns a recipe owned by the calling user", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
        },
      });

      const response = await trpc.recipes.getRecipe({
        id: recipe.id,
      });
      expect(response.id).toEqual(recipe.id);
    });
  });

  describe("error", () => {
    test("throws when the recipe does not exist", async ({ trpc }) => {
      await expect(
        trpc.recipes.getRecipe({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow("Recipe not found");
    });
  });
});
