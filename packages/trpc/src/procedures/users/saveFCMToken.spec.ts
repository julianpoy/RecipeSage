import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test, anonymousTrpc } from "../../testutils";

describe("saveFCMToken", () => {
  describe("success", () => {
    test("creates an fcm token for the caller", async ({ trpc, user }) => {
      const token = faker.string.alphanumeric(24);

      await trpc.users.saveFCMToken({ fcmToken: token });

      const tokens = await prisma.fCMToken.findMany({
        where: { token },
      });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].userId).toEqual(user.id);
    });

    test("does not duplicate when saving the same token twice", async ({
      trpc,
      user,
    }) => {
      const token = faker.string.alphanumeric(24);

      await trpc.users.saveFCMToken({ fcmToken: token });
      await trpc.users.saveFCMToken({ fcmToken: token });

      const tokens = await prisma.fCMToken.findMany({
        where: { token, userId: user.id },
      });
      expect(tokens).toHaveLength(1);
    });

    test("reassigns a token previously held by another user", async ({
      trpc,
      user,
      user2,
    }) => {
      const token = faker.string.alphanumeric(24);
      await prisma.fCMToken.create({
        data: { token, userId: user2.id },
      });

      await trpc.users.saveFCMToken({ fcmToken: token });

      const tokens = await prisma.fCMToken.findMany({
        where: { token },
      });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].userId).toEqual(user.id);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.users.saveFCMToken({
          fcmToken: faker.string.alphanumeric(24),
        }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
