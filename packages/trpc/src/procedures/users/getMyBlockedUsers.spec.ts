import { prisma } from "@recipesage/prisma";
import { test, anonymousTrpc } from "../../testutils";

describe("getMyBlockedUsers", () => {
  describe("success", () => {
    test("returns the users that the caller has blocked", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.userBlock.create({
        data: { blockerUserId: user.id, blockedUserId: user2.id },
      });

      const blockedUsers = await trpc.users.getMyBlockedUsers();

      expect(blockedUsers.map((blockedUser) => blockedUser.id)).toEqual([
        user2.id,
      ]);
    });

    test("does not return users who have blocked the caller", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.userBlock.create({
        data: { blockerUserId: user2.id, blockedUserId: user.id },
      });

      const blockedUsers = await trpc.users.getMyBlockedUsers();

      expect(blockedUsers).toEqual([]);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(anonymousTrpc.users.getMyBlockedUsers()).rejects.toThrow(
        "Must be logged in",
      );
    });
  });
});
