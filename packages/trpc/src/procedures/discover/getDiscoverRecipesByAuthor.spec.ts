import { prisma, DiscoverApprovalState } from "@recipesage/prisma";
import { discoverRecipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("getDiscoverRecipesByAuthor", () => {
  describe("success", () => {
    test("returns only active recipes to a non-author", async ({ user }) => {
      const active = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.PENDING,
        },
      });
      await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.SHADOWBANNED,
        },
      });

      const response = await anonymousTrpc.discover.getDiscoverRecipesByAuthor({
        authorId: user.id,
      });
      expect(response.recipes.map((recipe) => recipe.id)).toEqual([active.id]);
    });

    test("returns all of an author's recipes to the author", async ({
      trpc,
      user,
    }) => {
      await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.PENDING,
        },
      });
      await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.SHADOWBANNED,
        },
      });

      const response = await trpc.discover.getDiscoverRecipesByAuthor({
        authorId: user.id,
      });
      expect(response.recipes).toHaveLength(3);
    });

    test("excludes soft-deleted recipes even from the author", async ({
      trpc,
      user,
    }) => {
      const active = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      await prisma.discoverRecipe.create({
        data: { ...discoverRecipeFactory(user.id), deletedAt: new Date() },
      });

      const response = await trpc.discover.getDiscoverRecipesByAuthor({
        authorId: user.id,
      });
      expect(response.recipes.map((recipe) => recipe.id)).toEqual([active.id]);
    });
  });
});
