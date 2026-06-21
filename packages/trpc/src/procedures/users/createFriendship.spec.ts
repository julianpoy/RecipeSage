import { prisma } from "@recipesage/prisma";
import { test, anonymousTrpc } from "../../testutils";

describe("createFriendship", () => {
  describe("success", () => {
    test("creates a friendship from the caller to another user", async ({
      trpc,
      user,
      user2,
    }) => {
      await trpc.users.createFriendship({ friendId: user2.id });

      const friendships = await prisma.friendship.findMany({
        where: { userId: user.id, friendId: user2.id },
      });
      expect(friendships).toHaveLength(1);
    });

    test("does not create duplicate friendships when called twice", async ({
      trpc,
      user,
      user2,
    }) => {
      await trpc.users.createFriendship({ friendId: user2.id });
      await trpc.users.createFriendship({ friendId: user2.id });

      const friendships = await prisma.friendship.findMany({
        where: { userId: user.id, friendId: user2.id },
      });
      expect(friendships).toHaveLength(1);
    });

    test("accepting an incoming request results in a mutual friendship", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.friendship.create({
        data: { userId: user2.id, friendId: user.id },
      });

      await trpc.users.createFriendship({ friendId: user2.id });

      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { userId: user.id, friendId: user2.id },
            { userId: user2.id, friendId: user.id },
          ],
        },
      });
      expect(friendships).toHaveLength(2);
    });
  });

  describe("error", () => {
    test("rejects friending yourself", async ({ trpc, user }) => {
      await expect(
        trpc.users.createFriendship({ friendId: user.id }),
      ).rejects.toThrow("can't create a friendship with yourself");
    });

    test("throws when the target user does not exist", async ({ trpc }) => {
      await expect(
        trpc.users.createFriendship({
          friendId: "00000000-0000-0000-0000-000000000000",
        }),
      ).rejects.toThrow("No user found with that id");
    });

    test("throws when the caller is not logged in", async ({ user2 }) => {
      await expect(
        anonymousTrpc.users.createFriendship({ friendId: user2.id }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
