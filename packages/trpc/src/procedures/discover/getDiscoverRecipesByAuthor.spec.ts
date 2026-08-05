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

    test("does not reveal a shadowban to the author", async ({
      trpc,
      user,
    }) => {
      const shadowbanned = await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.SHADOWBANNED,
        },
      });

      const response = await trpc.discover.getDiscoverRecipesByAuthor({
        authorId: user.id,
      });
      const returned = response.recipes.find(
        (recipe) => recipe.id === shadowbanned.id,
      );
      expect(returned?.approvalState).toEqual(DiscoverApprovalState.PENDING);
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

    test("pages consistently when recipes share a createdAt", async ({
      user,
    }) => {
      const createdAt = new Date("2023-01-01T00:00:00Z");
      const created = [];
      for (let i = 0; i < 6; i++) {
        created.push(
          await prisma.discoverRecipe.create({
            data: { ...discoverRecipeFactory(user.id), createdAt },
          }),
        );
      }

      const expected = created
        .map((recipe) => recipe.id)
        .sort()
        .reverse();

      const paged: string[] = [];
      for (let offset = 0; offset < expected.length; offset += 2) {
        const page = await anonymousTrpc.discover.getDiscoverRecipesByAuthor({
          authorId: user.id,
          offset,
          limit: 2,
        });
        paged.push(...page.recipes.map((recipe) => recipe.id));
      }

      expect(paged).toEqual(expected);
    });
  });
});
