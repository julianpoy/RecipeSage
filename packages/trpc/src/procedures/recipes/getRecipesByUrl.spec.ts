import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test } from "../../testutils";

describe("getRecipesByUrl", () => {
  describe("success", () => {
    test("returns recipes that match the given url", async ({ trpc, user }) => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          url: "https://example.com/recipes/mexican-chicken",
        },
      });

      const response = await trpc.recipes.getRecipesByUrl({
        url: "https://example.com/recipes/mexican-chicken",
      });
      expect(response.length).toEqual(1);
      expect(response[0].url).toEqual(
        "https://example.com/recipes/mexican-chicken",
      );
    });

    test("returns an empty list when no recipes match the url", async ({
      trpc,
      user,
    }) => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          url: "https://example.com/recipes/mexican-empanadas",
        },
      });

      const response = await trpc.recipes.getRecipesByUrl({
        url: "https://example.com/recipes/spanish-pork",
      });
      expect(response.length).toEqual(0);
    });

    test("does not return recipes belonging to another user", async ({
      trpc,
      user2,
    }) => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user2.id),
          url: "https://example.com/recipes/caviar",
        },
      });

      const response = await trpc.recipes.getRecipesByUrl({
        url: "https://example.com/recipes/caviar",
      });
      expect(response.length).toEqual(0);
    });
  });
});
