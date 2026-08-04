import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test, anonymousTrpc } from "../../testutils";

describe("removeFCMToken", () => {
  describe("success", () => {
    test("removes the caller's token", async ({ trpc, user }) => {
      const token = faker.string.alphanumeric(24);
      await prisma.fCMToken.create({
        data: { token, userId: user.id },
      });

      await trpc.users.removeFCMToken({ fcmToken: token });

      const tokens = await prisma.fCMToken.findMany({
        where: { token },
      });
      expect(tokens).toEqual([]);
    });

    test("does not remove a matching token owned by another user", async ({
      trpc,
      user2,
    }) => {
      const token = faker.string.alphanumeric(24);
      await prisma.fCMToken.create({
        data: { token, userId: user2.id },
      });

      await trpc.users.removeFCMToken({ fcmToken: token });

      const tokens = await prisma.fCMToken.findMany({
        where: { token },
      });
      expect(tokens).toHaveLength(1);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.users.removeFCMToken({
          fcmToken: faker.string.alphanumeric(24),
        }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
