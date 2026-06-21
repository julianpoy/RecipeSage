import { prisma } from "@recipesage/prisma";
import { test, anonymousTrpc } from "../../testutils";

describe("saveFCMToken", () => {
  describe("success", () => {
    test("creates an fcm token for the caller", async ({ trpc, user }) => {
      await trpc.users.saveFCMToken({ fcmToken: "token-1" });

      const tokens = await prisma.fCMToken.findMany({
        where: { token: "token-1" },
      });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].userId).toEqual(user.id);
    });

    test("does not duplicate when saving the same token twice", async ({
      trpc,
      user,
    }) => {
      await trpc.users.saveFCMToken({ fcmToken: "token-1" });
      await trpc.users.saveFCMToken({ fcmToken: "token-1" });

      const tokens = await prisma.fCMToken.findMany({
        where: { token: "token-1", userId: user.id },
      });
      expect(tokens).toHaveLength(1);
    });

    test("reassigns a token previously held by another user", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.fCMToken.create({
        data: { token: "token-1", userId: user2.id },
      });

      await trpc.users.saveFCMToken({ fcmToken: "token-1" });

      const tokens = await prisma.fCMToken.findMany({
        where: { token: "token-1" },
      });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].userId).toEqual(user.id);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.users.saveFCMToken({ fcmToken: "token-1" }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
