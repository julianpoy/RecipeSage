import { prisma } from "@recipesage/prisma";
import { friendshipFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("getMyFriends", () => {
  describe("success", () => {
    test("returns empty arrays when the caller has no friendships", async ({
      trpc,
    }) => {
      const response = await trpc.users.getMyFriends();

      expect(response.friends).toEqual([]);
      expect(response.incomingRequests).toEqual([]);
      expect(response.outgoingRequests).toEqual([]);
    });

    test("returns confirmed friends", async ({ trpc, user, user2 }) => {
      await prisma.friendship.createMany({
        data: friendshipFactory(user.id, user2.id),
      });

      const response = await trpc.users.getMyFriends();

      expect(response.friends.map((f) => f.id)).toEqual([user2.id]);
      expect(response.incomingRequests).toEqual([]);
      expect(response.outgoingRequests).toEqual([]);
    });

    test("returns incoming friend requests", async ({ trpc, user, user2 }) => {
      await prisma.friendship.create({
        data: { userId: user2.id, friendId: user.id },
      });

      const response = await trpc.users.getMyFriends();

      expect(response.incomingRequests.map((f) => f.id)).toEqual([user2.id]);
      expect(response.friends).toEqual([]);
      expect(response.outgoingRequests).toEqual([]);
    });

    test("returns outgoing friend requests", async ({ trpc, user, user2 }) => {
      await prisma.friendship.create({
        data: { userId: user.id, friendId: user2.id },
      });

      const response = await trpc.users.getMyFriends();

      expect(response.outgoingRequests.map((f) => f.id)).toEqual([user2.id]);
      expect(response.friends).toEqual([]);
      expect(response.incomingRequests).toEqual([]);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(anonymousTrpc.users.getMyFriends()).rejects.toThrow(
        "Must be logged in",
      );
    });
  });
});
