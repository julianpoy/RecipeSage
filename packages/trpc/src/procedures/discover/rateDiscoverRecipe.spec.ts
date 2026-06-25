import { prisma, DiscoverApprovalState } from "@recipesage/prisma";
import { discoverRecipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("rateDiscoverRecipe", () => {
  describe("success", () => {
    test("records a rating and updates the aggregate", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const response = await trpc.discover.rateDiscoverRecipe({
        id: recipe.id,
        rating: 4,
      });
      expect(response.myRating).toEqual(4);
      expect(response.ratingAverage).toEqual(4);
      expect(response.ratingCount).toEqual(1);

      const updated = await prisma.discoverRecipe.findUnique({
        where: { id: recipe.id },
      });
      expect(updated?.ratingAverage).toEqual(4);
      expect(updated?.ratingCount).toEqual(1);
    });

    test("overwrites the caller's previous rating", async ({ trpc, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await trpc.discover.rateDiscoverRecipe({ id: recipe.id, rating: 4 });
      const response = await trpc.discover.rateDiscoverRecipe({
        id: recipe.id,
        rating: 2,
      });
      expect(response.ratingAverage).toEqual(2);
      expect(response.ratingCount).toEqual(1);
    });

    test("averages ratings from multiple users", async ({
      trpc,
      trpc2,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await trpc.discover.rateDiscoverRecipe({ id: recipe.id, rating: 4 });
      const response = await trpc2.discover.rateDiscoverRecipe({
        id: recipe.id,
        rating: 2,
      });
      expect(response.ratingAverage).toEqual(3);
      expect(response.ratingCount).toEqual(2);
    });

    test("clears the rating when rating is 0", async ({ trpc, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await trpc.discover.rateDiscoverRecipe({ id: recipe.id, rating: 5 });
      const response = await trpc.discover.rateDiscoverRecipe({
        id: recipe.id,
        rating: 0,
      });
      expect(response.myRating).toBeNull();
      expect(response.ratingCount).toEqual(0);
      expect(response.ratingAverage).toEqual(0);
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
        trpc2.discover.rateDiscoverRecipe({ id: recipe.id, rating: 4 }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("requires authentication", async ({ user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await expect(
        anonymousTrpc.discover.rateDiscoverRecipe({ id: recipe.id, rating: 4 }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
