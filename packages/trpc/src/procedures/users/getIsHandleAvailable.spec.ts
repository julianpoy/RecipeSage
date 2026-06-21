import { prisma } from "@recipesage/prisma";
import { test, anonymousTrpc } from "../../testutils";

describe("getIsHandleAvailable", () => {
  describe("success", () => {
    test("returns available when no user has the handle", async ({ trpc }) => {
      const response = await trpc.users.getIsHandleAvailable({
        handle: "anunusedhandle",
      });

      expect(response.available).toEqual(true);
    });

    test("returns unavailable when a user already has the handle", async ({
      trpc,
      user2,
    }) => {
      await prisma.user.update({
        where: { id: user2.id },
        data: { handle: "taken" },
      });

      const response = await trpc.users.getIsHandleAvailable({
        handle: "taken",
      });

      expect(response.available).toEqual(false);
    });

    test("matches handles case-insensitively", async ({ trpc, user2 }) => {
      await prisma.user.update({
        where: { id: user2.id },
        data: { handle: "taken" },
      });

      const response = await trpc.users.getIsHandleAvailable({
        handle: "TAKEN",
      });

      expect(response.available).toEqual(false);
    });

    test("treats the caller's own handle as available", async ({
      trpc,
      user,
    }) => {
      await prisma.user.update({
        where: { id: user.id },
        data: { handle: "myhandle" },
      });

      const response = await trpc.users.getIsHandleAvailable({
        handle: "myhandle",
      });

      expect(response.available).toEqual(true);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.users.getIsHandleAvailable({ handle: "anything" }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
