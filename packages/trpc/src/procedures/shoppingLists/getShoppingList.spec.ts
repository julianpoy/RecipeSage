import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("getShoppingList", () => {
  describe("success", () => {
    test("gets a shopping list as the owner", async ({ trpc, user }) => {
      const title = faker.string.alphanumeric(10);
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title,
          userId: user.id,
        },
      });

      const response = await trpc.shoppingLists.getShoppingList({
        id: shoppingList.id,
      });
      expect(response.id).toEqual(shoppingList.id);
      expect(response.title).toEqual(title);
    });

    test("gets a shopping list as a collaborator", async ({
      trpc2,
      user,
      user2,
    }) => {
      const title = faker.string.alphanumeric(10);
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title,
          userId: user.id,
          collaboratorUsers: {
            createMany: {
              data: [{ userId: user2.id }],
            },
          },
        },
      });

      const response = await trpc2.shoppingLists.getShoppingList({
        id: shoppingList.id,
      });
      expect(response.id).toEqual(shoppingList.id);
      expect(response.title).toEqual(title);
    });
  });

  describe("error", () => {
    test("throws when the shopping list does not exist", async ({ trpc }) => {
      await expect(
        trpc.shoppingLists.getShoppingList({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow("Shopping list not found or you do not have access");
    });

    test("throws when the user has no access to the shopping list", async ({
      trpc2,
      user,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await expect(
        trpc2.shoppingLists.getShoppingList({
          id: shoppingList.id,
        }),
      ).rejects.toThrow("Shopping list not found or you do not have access");
    });
  });
});
