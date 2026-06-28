import { prisma, DiscoverApprovalState } from "@recipesage/prisma";
import { discoverRecipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("saveDiscoverRecipe", () => {
  describe("success", () => {
    test("copies the recipe into the caller's collection", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const response = await trpc.discover.saveDiscoverRecipe({
        id: recipe.id,
      });

      const saved = await prisma.recipe.findUnique({
        where: { id: response.recipeId },
      });
      expect(saved?.userId).toEqual(user.id);
      expect(saved?.source).toEqual("RecipeSage Discover");

      const updated = await prisma.discoverRecipe.findUnique({
        where: { id: recipe.id },
      });
      expect(updated?.saveCount).toEqual(1);

      const saves = await prisma.discoverRecipeSave.findMany({
        where: { discoverRecipeId: recipe.id, userId: user.id },
      });
      expect(saves).toHaveLength(1);
    });

    test("is idempotent and does not duplicate the copy on a repeat save", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const first = await trpc.discover.saveDiscoverRecipe({ id: recipe.id });
      const second = await trpc.discover.saveDiscoverRecipe({ id: recipe.id });
      expect(first.recipeId).toEqual(second.recipeId);

      const updated = await prisma.discoverRecipe.findUnique({
        where: { id: recipe.id },
      });
      expect(updated?.saveCount).toEqual(1);

      const saves = await prisma.discoverRecipeSave.findMany({
        where: { discoverRecipeId: recipe.id, userId: user.id },
      });
      expect(saves).toHaveLength(1);

      const copies = await prisma.recipe.findMany({
        where: { userId: user.id, source: "RecipeSage Discover" },
      });
      expect(copies).toHaveLength(1);
    });
  });

  describe("error", () => {
    test("hides a shadowbanned recipe from a non-author", async ({
      trpc2,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.SHADOWBANNED,
        },
      });

      await expect(
        trpc2.discover.saveDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("hides a pending recipe from a non-author", async ({
      trpc2,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.PENDING,
        },
      });

      await expect(
        trpc2.discover.saveDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("requires authentication", async ({ user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await expect(
        anonymousTrpc.discover.saveDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
