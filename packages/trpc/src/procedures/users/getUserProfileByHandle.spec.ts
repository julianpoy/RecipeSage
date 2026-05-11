import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test, anonymousTrpc } from "../../testutils";

describe("getUserProfileByHandle", () => {
  describe("success", () => {
    test("returns the matching user profile", async ({ trpc, user2 }) => {
      const handle = faker.string.alphanumeric(12).toLowerCase();
      await prisma.user.update({
        where: { id: user2.id },
        data: { handle, enableProfile: true },
      });

      const response = await trpc.users.getUserProfileByHandle({ handle });

      expect(response.id).toEqual(user2.id);
      expect(response.handle).toEqual(handle);
    });
  });

  describe("error", () => {
    test("throws when no user has the handle", async ({ trpc }) => {
      await expect(
        trpc.users.getUserProfileByHandle({ handle: "no-such-handle" }),
      ).rejects.toThrow("No profile found with that handle");
    });

    test("throws when the user's profile is not enabled", async ({
      trpc,
      user2,
    }) => {
      const handle = faker.string.alphanumeric(12).toLowerCase();
      await prisma.user.update({
        where: { id: user2.id },
        data: { handle, enableProfile: false },
      });

      await expect(
        trpc.users.getUserProfileByHandle({ handle }),
      ).rejects.toThrow("No profile found with that handle");
    });

    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.users.getUserProfileByHandle({ handle: "anything" }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
