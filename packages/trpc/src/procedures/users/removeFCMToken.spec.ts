import { prisma } from "@recipesage/prisma";
import { test, anonymousTrpc } from "../../testutils";

describe("removeFCMToken", () => {
  describe("success", () => {
    test("removes the caller's token", async ({ trpc, user }) => {
      await prisma.fCMToken.create({
        data: { token: "token-1", userId: user.id },
      });

      await trpc.users.removeFCMToken({ fcmToken: "token-1" });

      const tokens = await prisma.fCMToken.findMany({
        where: { token: "token-1" },
      });
      expect(tokens).toEqual([]);
    });

    test("does not remove a matching token owned by another user", async ({
      trpc,
      user2,
    }) => {
      await prisma.fCMToken.create({
        data: { token: "token-1", userId: user2.id },
      });

      await trpc.users.removeFCMToken({ fcmToken: "token-1" });

      const tokens = await prisma.fCMToken.findMany({
        where: { token: "token-1" },
      });
      expect(tokens).toHaveLength(1);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.users.removeFCMToken({ fcmToken: "token-1" }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
