import { prisma } from "@recipesage/prisma";
import { test, anonymousTrpc } from "../../testutils";

describe("unblockUser", () => {
  describe("success", () => {
    test("removes the block that the caller placed", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.userBlock.create({
        data: { blockerUserId: user.id, blockedUserId: user2.id },
      });

      await expect(
        trpc.users.unblockUser({ userId: user2.id }),
      ).resolves.toEqual("Ok");

      const userBlock = await prisma.userBlock.findFirst({
        where: { blockerUserId: user.id, blockedUserId: user2.id },
      });
      expect(userBlock).toBeNull();
    });

    test("does not remove a block that the other user placed", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.userBlock.create({
        data: { blockerUserId: user2.id, blockedUserId: user.id },
      });

      await trpc.users.unblockUser({ userId: user2.id });

      const userBlock = await prisma.userBlock.findFirst({
        where: { blockerUserId: user2.id, blockedUserId: user.id },
      });
      expect(userBlock).not.toBeNull();
    });

    test("succeeds when no block exists", async ({ trpc, user2 }) => {
      await expect(
        trpc.users.unblockUser({ userId: user2.id }),
      ).resolves.toEqual("Ok");
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async ({ user2 }) => {
      await expect(
        anonymousTrpc.users.unblockUser({ userId: user2.id }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
