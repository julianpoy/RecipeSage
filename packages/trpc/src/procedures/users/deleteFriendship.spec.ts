import { prisma } from "@recipesage/prisma";
import { friendshipFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("deleteFriendship", () => {
  describe("success", () => {
    test("removes the friendship in both directions", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.friendship.createMany({
        data: friendshipFactory(user.id, user2.id),
      });

      await trpc.users.deleteFriendship({ friendId: user2.id });

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

    test("succeeds when no friendship exists", async ({ trpc, user2 }) => {
      await expect(
        trpc.users.deleteFriendship({ friendId: user2.id }),
      ).resolves.toEqual("Ok");
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async ({ user2 }) => {
      await expect(
        anonymousTrpc.users.deleteFriendship({ friendId: user2.id }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
