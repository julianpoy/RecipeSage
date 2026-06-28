import {
  prisma,
  DiscoverReportSource,
  DiscoverReportStatus,
} from "@recipesage/prisma";
import { discoverRecipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("reportDiscoverRecipe", () => {
  describe("success", () => {
    test("persists a user report with its reason", async ({ user, trpc }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const response = await trpc.discover.reportDiscoverRecipe({
        id: recipe.id,
        reason: "This recipe is an advertisement",
      });
      expect(response.reported).toEqual(true);

      const reports = await prisma.discoverRecipeReport.findMany({
        where: {
          discoverRecipeId: recipe.id,
        },
      });
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({
        source: DiscoverReportSource.USER,
        reporterId: user.id,
        reason: "This recipe is an advertisement",
        status: DiscoverReportStatus.OPEN,
      });
    });

    test("updates the existing report when the same user reports again", async ({
      user,
      trpc,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await trpc.discover.reportDiscoverRecipe({
        id: recipe.id,
        reason: "first report",
      });
      await trpc.discover.reportDiscoverRecipe({
        id: recipe.id,
        reason: "second report",
      });

      const reports = await prisma.discoverRecipeReport.findMany({
        where: {
          discoverRecipeId: recipe.id,
        },
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].reason).toEqual("second report");
    });
  });

  describe("error", () => {
    test("rejects an anonymous reporter", async ({ user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await expect(
        anonymousTrpc.discover.reportDiscoverRecipe({
          id: recipe.id,
          reason: "This recipe is inappropriate",
        }),
      ).rejects.toThrow();
    });

    test("throws when the recipe does not exist", async ({ trpc }) => {
      await expect(
        trpc.discover.reportDiscoverRecipe({
          id: "00000000-0c70-4718-aacc-05add19096b5",
          reason: "This recipe is inappropriate",
        }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("rejects a reason shorter than five characters", async ({
      user,
      trpc,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await expect(
        trpc.discover.reportDiscoverRecipe({
          id: recipe.id,
          reason: "no",
        }),
      ).rejects.toThrow();
    });
  });
});
