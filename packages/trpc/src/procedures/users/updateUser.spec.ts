import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { validatePasswordHash } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("updateUser", () => {
  describe("success", () => {
    test("updates the caller's name", async ({ trpc, user }) => {
      const newName = faker.person.fullName();

      const response = await trpc.users.updateUser({ name: newName });
      expect(response).toEqual("Updated");

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.name).toEqual(newName);
    });

    test("updates the caller's email, normalizing to lowercase", async ({
      trpc,
      user,
    }) => {
      const newEmail = `${faker.string.alphanumeric(12)}@Example.com`;

      await trpc.users.updateUser({ email: newEmail });

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.email).toEqual(newEmail.toLowerCase());
    });

    test("updates the caller's password and deletes existing sessions", async ({
      trpc,
      user,
      session,
    }) => {
      const newPassword = faker.internet.password({ length: 12 });

      await trpc.users.updateUser({ password: newPassword });

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(updated.passwordHash).not.toEqual(user.passwordHash);
      if (
        !updated.passwordHash ||
        !updated.passwordSalt ||
        !updated.passwordVersion
      ) {
        throw new Error("password credentials missing after updateUser");
      }
      expect(
        await validatePasswordHash(newPassword, {
          passwordHash: updated.passwordHash,
          passwordSalt: updated.passwordSalt,
          passwordVersion: updated.passwordVersion,
        }),
      ).toEqual(true);

      const remainingSession = await prisma.session.findUnique({
        where: { id: session.id },
      });
      expect(remainingSession).toBeNull();
    });
  });

  describe("error", () => {
    test("throws when the email is already in use by another account", async ({
      trpc,
      user2,
    }) => {
      await expect(
        trpc.users.updateUser({ email: user2.email }),
      ).rejects.toThrow(
        "That email address is already in use by another account",
      );
    });

    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.users.updateUser({ name: "anything" }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
