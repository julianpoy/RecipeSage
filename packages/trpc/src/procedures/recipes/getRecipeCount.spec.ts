import { prisma } from "@recipesage/prisma";
import { recipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("getRecipeCount", () => {
  describe("success", () => {
    test("counts only the caller's recipes within the folder", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          folder: "inbox",
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          folder: "inbox",
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          folder: "main",
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user2.id),
          folder: "inbox",
        },
      });

      const inbox = await trpc.recipes.getRecipeCount({ folder: "inbox" });
      expect(inbox.count).toEqual(2);

      const main = await trpc.recipes.getRecipeCount({ folder: "main" });
      expect(main.count).toEqual(1);
    });

    test("counts the caller's recipes across all folders when no folder is passed", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          folder: "inbox",
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          folder: "main",
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user2.id),
          folder: "main",
        },
      });

      const all = await trpc.recipes.getRecipeCount({});
      expect(all.count).toEqual(2);
    });

    test("returns zero when the folder is empty", async ({ trpc }) => {
      const result = await trpc.recipes.getRecipeCount({ folder: "inbox" });
      expect(result.count).toEqual(0);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.recipes.getRecipeCount({ folder: "inbox" }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
