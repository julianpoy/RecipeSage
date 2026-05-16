import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test } from "../../testutils";

describe("getRecipesByTitle", () => {
  describe("success", () => {
    test("returns recipes that match the given title", async ({
      trpc,
      user,
    }) => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Mexican chicken",
        },
      });

      const response = await trpc.recipes.getRecipesByTitle({
        title: "Mexican chicken",
      });
      expect(response.length).toEqual(1);
      expect(response[0].title).toEqual("Mexican chicken");
    });

    test("returns an empty list when no recipes match the title", async ({
      trpc,
      user,
    }) => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Mexican empanadas",
        },
      });

      const response = await trpc.recipes.getRecipesByTitle({
        title: "Spanish pork",
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
          title: "caviar",
        },
      });

      const response = await trpc.recipes.getRecipesByTitle({
        title: "caviar",
      });
      expect(response.length).toEqual(0);
    });
  });
});
