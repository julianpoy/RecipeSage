import {
  prisma,
  DiscoverApprovalState,
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

    test("reopens a previously resolved report when the user reports again", async ({
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
      await prisma.discoverRecipeReport.updateMany({
        where: {
          discoverRecipeId: recipe.id,
          reporterId: user.id,
        },
        data: {
          status: DiscoverReportStatus.DISMISSED,
        },
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
      expect(reports[0].status).toEqual(DiscoverReportStatus.OPEN);
      expect(reports[0].reason).toEqual("second report");
    });

    test("allows reporting a recipe that is still pending moderation", async ({
      user,
      trpc,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: {
          ...discoverRecipeFactory(user.id),
          approvalState: DiscoverApprovalState.PENDING,
        },
      });

      const response = await trpc.discover.reportDiscoverRecipe({
        id: recipe.id,
        reason: "Pending but abusive",
      });
      expect(response.reported).toEqual(true);
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
      ).rejects.toThrow("Must be logged in");
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
