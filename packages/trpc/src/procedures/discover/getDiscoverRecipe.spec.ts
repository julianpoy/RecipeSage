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

describe("getDiscoverRecipe", () => {
  describe("success", () => {
    test("returns an active recipe to an anonymous viewer", async ({
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const response = await anonymousTrpc.discover.getDiscoverRecipe({
        id: recipe.id,
      });
      expect(response.id).toEqual(recipe.id);
      expect(response.myRating).toBeNull();
      expect(response.isSaved).toEqual(false);
    });

    test("returns a pending recipe to its author", async ({ trpc, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.PENDING,
        },
      });

      const response = await trpc.discover.getDiscoverRecipe({
        id: recipe.id,
      });
      expect(response.id).toEqual(recipe.id);
    });

    test("returns a shadowbanned recipe to its author", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.SHADOWBANNED,
        },
      });

      const response = await trpc.discover.getDiscoverRecipe({
        id: recipe.id,
      });
      expect(response.id).toEqual(recipe.id);
    });

    test("returns an own recipe to a shadowbanned author", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      await shadowbanUser(user.id);

      const response = await trpc.discover.getDiscoverRecipe({
        id: recipe.id,
      });
      expect(response.id).toEqual(recipe.id);
    });

    test("includes the viewer's own rating and saved state", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      await prisma.discoverRecipeRating.create({
        data: {
          discoverRecipeId: recipe.id,
          userId: user.id,
          rating: 4,
        },
      });
      await prisma.discoverRecipeSave.create({
        data: {
          discoverRecipeId: recipe.id,
          userId: user.id,
        },
      });

      const response = await trpc.discover.getDiscoverRecipe({
        id: recipe.id,
      });
      expect(response.myRating).toEqual(4);
      expect(response.isSaved).toEqual(true);
    });

    test("only includes active linked recipes", async ({ user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      const activeLink = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      const pendingLink = await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.PENDING,
        },
      });
      await prisma.discoverRecipeLink.createMany({
        data: [
          {
            discoverRecipeId: recipe.id,
            linkedDiscoverRecipeId: activeLink.id,
          },
          {
            discoverRecipeId: recipe.id,
            linkedDiscoverRecipeId: pendingLink.id,
          },
        ],
      });

      const response = await anonymousTrpc.discover.getDiscoverRecipe({
        id: recipe.id,
      });
      const linkedIds = response.linkedRecipes.map((linked) => linked.id);
      expect(linkedIds).toContain(activeLink.id);
      expect(linkedIds).not.toContain(pendingLink.id);
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
        trpc2.discover.getDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("hides a shadowbanned recipe from an anonymous viewer", async ({
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.SHADOWBANNED,
        },
      });

      await expect(
        anonymousTrpc.discover.getDiscoverRecipe({ id: recipe.id }),
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
        trpc2.discover.getDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("hides recipes of a shadowbanned author from a non-author", async ({
      trpc2,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      await shadowbanUser(user.id);

      await expect(
        trpc2.discover.getDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("throws when the recipe does not exist", async () => {
      await expect(
        anonymousTrpc.discover.getDiscoverRecipe({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow("Could not find that discover recipe");
    });
  });
});
