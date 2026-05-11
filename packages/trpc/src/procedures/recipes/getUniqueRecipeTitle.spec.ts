import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test } from "../../testutils";

describe("getUniqueRecipeTitle", () => {
  describe("success", () => {
    test("appends a numeric suffix when the title is taken", async ({
      trpc,
      user,
    }) => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Spaghetti",
        },
      });

      const response = await trpc.recipes.getUniqueRecipeTitle({
        title: "Spaghetti",
      });
      expect(response).toEqual("Spaghetti (1)");

      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Spaghetti (1)",
        },
      });
      const response2 = await trpc.recipes.getUniqueRecipeTitle({
        title: "Spaghetti",
      });
      expect(response2).toEqual("Spaghetti (2)");
    });

    test("ignores recipes whose ids are passed in ignoreIds", async ({
      trpc,
      user,
    }) => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Spaghetti with meatballs",
        },
      });
      const ignored = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Spaghetti with meatballs (1)",
        },
      });

      const response = await trpc.recipes.getUniqueRecipeTitle({
        title: "Spaghetti with meatballs",
        ignoreIds: [ignored.id],
      });
      expect(response).toEqual("Spaghetti with meatballs (1)");
    });

    test("scopes uniqueness to the calling user", async ({ trpc, user2 }) => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user2.id),
          title: "Spaghetti with tomatoes",
        },
      });

      const response = await trpc.recipes.getUniqueRecipeTitle({
        title: "Spaghetti with tomatoes",
      });
      expect(response).toEqual("Spaghetti with tomatoes");
    });
  });
});
