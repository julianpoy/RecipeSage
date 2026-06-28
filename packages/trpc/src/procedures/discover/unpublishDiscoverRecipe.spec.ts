import { prisma, DiscoverReportSource } from "@recipesage/prisma";
import { discoverRecipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("unpublishDiscoverRecipe", () => {
  describe("success", () => {
    test("soft-deletes the recipe and retains its reports", async ({
      trpc,
      user,
      user2,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });
      await prisma.discoverRecipeReport.create({
        data: {
          discoverRecipeId: recipe.id,
          source: DiscoverReportSource.SYSTEM,
          reason: "system flag",
        },
      });
      await prisma.discoverRecipeReport.create({
        data: {
          discoverRecipeId: recipe.id,
          source: DiscoverReportSource.USER,
          reporterId: user2.id,
          reason: "user report",
        },
      });

      await trpc.discover.unpublishDiscoverRecipe({ id: recipe.id });

      const found = await prisma.discoverRecipe.findUnique({
        where: { id: recipe.id },
      });
      expect(found).not.toBeNull();
      expect(found?.deletedAt).not.toBeNull();

      const reports = await prisma.discoverRecipeReport.findMany({
        where: { discoverRecipeId: recipe.id },
      });
      expect(reports).toHaveLength(2);

      await expect(
        trpc.discover.getDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Could not find that discover recipe");
    });
  });

  describe("error", () => {
    test("rejects a recipe the caller does not own", async ({
      trpc,
      user2,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user2.id),
      });

      await expect(
        trpc.discover.unpublishDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Could not find that discover recipe");

      const stillThere = await prisma.discoverRecipe.findUnique({
        where: { id: recipe.id },
      });
      expect(stillThere).not.toBeNull();
    });

    test("requires authentication", async ({ user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await expect(
        anonymousTrpc.discover.unpublishDiscoverRecipe({ id: recipe.id }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
