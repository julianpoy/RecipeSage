import {
  prisma,
  DiscoverApprovalState,
  UserDiscoverStanding,
} from "@recipesage/prisma";
import { discoverRecipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

const shadowbanUser = (userId: string) =>
  prisma.user.update({
    where: { id: userId },
    data: { discoverStanding: UserDiscoverStanding.SHADOWBANNED },
  });

describe("saveDiscoverRecipe", () => {
  describe("success", () => {
    test("copies another author's recipe into the saver's collection", async ({
      trpc2,
      user,
      user2,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const response = await trpc2.discover.saveDiscoverRecipe({
        id: recipe.id,
      });

      const saved = await prisma.recipe.findUnique({
        where: { id: response.recipeId },
      });
      expect(saved?.userId).toEqual(user2.id);
      expect(saved?.fromUserId).toEqual(user.id);
      expect(saved?.source).toEqual("RecipeSage Discover");

      const saves = await prisma.discoverRecipeSave.findMany({
        where: { discoverRecipeId: recipe.id, userId: user2.id },
      });
      expect(saves).toHaveLength(1);
      expect(saves[0].recipeId).toEqual(response.recipeId);
    });

    test("creates a new copy and logs each save", async ({
      trpc2,
      user,
      user2,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const first = await trpc2.discover.saveDiscoverRecipe({ id: recipe.id });
      const second = await trpc2.discover.saveDiscoverRecipe({ id: recipe.id });
      expect(first.recipeId).not.toEqual(second.recipeId);

      const saves = await prisma.discoverRecipeSave.findMany({
        where: { discoverRecipeId: recipe.id, userId: user2.id },
      });
      expect(saves).toHaveLength(2);

      const copies = await prisma.recipe.findMany({
        where: { userId: user2.id, source: "RecipeSage Discover" },
      });
      expect(copies).toHaveLength(2);
    });

    test("copies the recipe using the provided title verbatim", async ({
      trpc2,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const response = await trpc2.discover.saveDiscoverRecipe({
        id: recipe.id,
        title: "My Chosen Title",
      });

      const saved = await prisma.recipe.findUnique({
        where: { id: response.recipeId },
      });
      expect(saved?.title).toEqual("My Chosen Title");
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

    test("hides a recipe by a shadowbanned author from a non-author", async ({
      trpc2,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      await shadowbanUser(user.id);

      await expect(
        trpc2.discover.saveDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("hides a soft-deleted recipe even from its author", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: { ...discoverRecipeFactory(user.id), deletedAt: new Date() },
      });

      await expect(
        trpc.discover.saveDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("rejects saving your own discover recipe", async ({ trpc, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await expect(
        trpc.discover.saveDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("You cannot save your own discover recipe");
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
