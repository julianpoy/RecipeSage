import { prisma } from "@recipesage/prisma";
import { friendshipFactory } from "@recipesage/util/server/general";
import { faker } from "@faker-js/faker";
import { test, anonymousTrpc } from "../../testutils";

describe("blockUser", () => {
  describe("success", () => {
    test("creates a block from the caller to the other user", async ({
      trpc,
      user,
      user2,
    }) => {
      await expect(trpc.users.blockUser({ userId: user2.id })).resolves.toEqual(
        "Blocked",
      );

      const userBlock = await prisma.userBlock.findUnique({
        where: {
          blockerUserId_blockedUserId: {
            blockerUserId: user.id,
            blockedUserId: user2.id,
          },
        },
      });
      expect(userBlock).not.toBeNull();
    });

    test("does not create duplicate blocks when called twice", async ({
      trpc,
      user,
      user2,
    }) => {
      await trpc.users.blockUser({ userId: user2.id });
      await trpc.users.blockUser({ userId: user2.id });

      const userBlocks = await prisma.userBlock.findMany({
        where: { blockerUserId: user.id, blockedUserId: user2.id },
      });
      expect(userBlocks).toHaveLength(1);
    });

    test("removes the friendship in both directions", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.friendship.createMany({
        data: friendshipFactory(user.id, user2.id),
      });

      await trpc.users.blockUser({ userId: user2.id });

      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { userId: user.id, friendId: user2.id },
            { userId: user2.id, friendId: user.id },
          ],
        },
      });
      expect(friendships).toHaveLength(0);
    });

    test("removes shopping list and meal plan collaborations in both directions", async ({
      trpc,
      user,
      user2,
    }) => {
      const myShoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
          collaboratorUsers: { create: { userId: user2.id } },
        },
      });
      const theirShoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user2.id,
          collaboratorUsers: { create: { userId: user.id } },
        },
      });
      const myMealPlan = await prisma.mealPlan.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
          collaboratorUsers: { create: { userId: user2.id } },
        },
      });
      const theirMealPlan = await prisma.mealPlan.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user2.id,
          collaboratorUsers: { create: { userId: user.id } },
        },
      });

      await trpc.users.blockUser({ userId: user2.id });

      const shoppingListCollaborators =
        await prisma.shoppingListCollaborator.findMany({
          where: {
            shoppingListId: {
              in: [myShoppingList.id, theirShoppingList.id],
            },
          },
        });
      expect(shoppingListCollaborators).toHaveLength(0);

      const mealPlanCollaborators = await prisma.mealPlanCollaborator.findMany({
        where: {
          mealPlanId: {
            in: [myMealPlan.id, theirMealPlan.id],
          },
        },
      });
      expect(mealPlanCollaborators).toHaveLength(0);
    });
  });

  describe("error", () => {
    test("rejects blocking yourself", async ({ trpc, user }) => {
      await expect(trpc.users.blockUser({ userId: user.id })).rejects.toThrow(
        "You can't block yourself",
      );
    });

    test("throws when the target user does not exist", async ({ trpc }) => {
      await expect(
        trpc.users.blockUser({
          userId: "00000000-0000-0000-0000-000000000000",
        }),
      ).rejects.toThrow("No user found with that id");
    });

    test("throws when the caller is not logged in", async ({ user2 }) => {
      await expect(
        anonymousTrpc.users.blockUser({ userId: user2.id }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
