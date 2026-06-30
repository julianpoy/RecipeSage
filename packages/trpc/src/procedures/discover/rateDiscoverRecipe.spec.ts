import {
  prisma,
  DiscoverApprovalState,
  UserDiscoverStanding,
} from "@recipesage/prisma";
import { discoverRecipeFactory } from "@recipesage/util/server/general";
import {
  test,
  anonymousTrpc,
  createCaller,
  createUser,
  createSession,
} from "../../testutils";

const shadowbanUser = (userId: string) =>
  prisma.user.update({
    where: { id: userId },
    data: { discoverStanding: UserDiscoverStanding.SHADOWBANNED },
  });

describe("rateDiscoverRecipe", () => {
  describe("success", () => {
    test("records a rating and updates the aggregate", async ({
      trpc2,
      user,
    }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const response = await trpc2.discover.rateDiscoverRecipe({
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

    test("overwrites the caller's previous rating", async ({ trpc2, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await trpc2.discover.rateDiscoverRecipe({ id: recipe.id, rating: 4 });
      const response = await trpc2.discover.rateDiscoverRecipe({
        id: recipe.id,
        rating: 2,
      });
      expect(response.ratingAverage).toEqual(2);
      expect(response.ratingCount).toEqual(1);
    });

    test("averages ratings from multiple users", async ({ trpc2, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      const user3 = await createUser();
      const session3 = await createSession(user3.id);
      const trpc3 = createCaller({ session: session3, language: "" });

      await trpc2.discover.rateDiscoverRecipe({ id: recipe.id, rating: 4 });
      const response = await trpc3.discover.rateDiscoverRecipe({
        id: recipe.id,
        rating: 2,
      });
      expect(response.ratingAverage).toEqual(3);
      expect(response.ratingCount).toEqual(2);

      await prisma.user.deleteMany({ where: { id: user3.id } });
    });

    test("clears the rating when rating is 0", async ({ trpc2, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await trpc2.discover.rateDiscoverRecipe({ id: recipe.id, rating: 5 });
      const response = await trpc2.discover.rateDiscoverRecipe({
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
        trpc2.discover.rateDiscoverRecipe({ id: recipe.id, rating: 4 }),
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
        trpc2.discover.rateDiscoverRecipe({ id: recipe.id, rating: 4 }),
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
        trpc.discover.rateDiscoverRecipe({ id: recipe.id, rating: 4 }),
      ).rejects.toThrow("Could not find that discover recipe");
    });

    test("rejects rating your own discover recipe", async ({ trpc, user }) => {
      const recipe = await prisma.discoverRecipe.create({
        data: discoverRecipeFactory(user.id),
      });

      await expect(
        trpc.discover.rateDiscoverRecipe({ id: recipe.id, rating: 4 }),
      ).rejects.toThrow("You cannot rate your own discover recipe");
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
