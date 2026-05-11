import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { recipeFactory } from "@recipesage/util/server/general";
import { test } from "../../testutils";

describe("createRecipe", () => {
  describe("success", () => {
    test("creates a recipe", async ({ trpc, user }) => {
      const response = await trpc.recipes.createRecipe({
        ...recipeFactory(user.id),
        folder: "main",
        rating: faker.number.int({ min: 1, max: 5 }),
        labelIds: [],
        imageIds: [],
      });

      const recipe = await prisma.recipe.findUnique({
        where: { id: response.id },
      });
      expect(recipe?.userId).toEqual(user.id);
    });
  });
});
