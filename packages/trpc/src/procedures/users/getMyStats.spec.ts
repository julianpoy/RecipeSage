import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { recipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("getMyStats", () => {
  describe("success", () => {
    test("returns zero counts for a fresh user", async ({ trpc, user }) => {
      const response = await trpc.users.getMyStats();

      expect(response.recipeCount).toEqual(0);
      expect(response.recipeImageCount).toEqual(0);
      expect(response.messageCount).toEqual(0);
      expect(response.createdAt.getTime()).toEqual(user.createdAt.getTime());
      expect(response.lastLogin).toBeNull();
    });

    test("counts the caller's recipes", async ({ trpc, user }) => {
      await prisma.recipe.create({ data: recipeFactory(user.id) });
      await prisma.recipe.create({ data: recipeFactory(user.id) });

      const response = await trpc.users.getMyStats();
      expect(response.recipeCount).toEqual(2);
    });

    test("counts recipe images attached to the caller's recipes", async ({
      trpc,
      user,
    }) => {
      const image = await prisma.image.create({
        data: {
          userId: user.id,
          location: faker.internet.url(),
          key: faker.string.alphanumeric(20),
          json: {},
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          recipeImages: {
            create: { imageId: image.id, order: 0 },
          },
        },
      });

      const response = await trpc.users.getMyStats();
      expect(response.recipeImageCount).toEqual(1);

      await prisma.image.delete({ where: { id: image.id } });
    });

    test("counts messages sent and received by the caller", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.message.create({
        data: { fromUserId: user.id, toUserId: user2.id, body: "hello" },
      });
      await prisma.message.create({
        data: { fromUserId: user2.id, toUserId: user.id, body: "hi back" },
      });

      const response = await trpc.users.getMyStats();
      expect(response.messageCount).toEqual(2);
    });

    test("returns the caller's last login", async ({ trpc, user }) => {
      const lastLogin = new Date("2024-06-01T12:00:00Z");
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin },
      });

      const response = await trpc.users.getMyStats();
      expect(response.lastLogin?.getTime()).toEqual(lastLogin.getTime());
    });

    test("does not count recipes belonging to another user", async ({
      trpc,
      user2,
    }) => {
      await prisma.recipe.create({ data: recipeFactory(user2.id) });

      const response = await trpc.users.getMyStats();
      expect(response.recipeCount).toEqual(0);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(anonymousTrpc.users.getMyStats()).rejects.toThrow(
        "Must be logged in",
      );
    });
  });
});
