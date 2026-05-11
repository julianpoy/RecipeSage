import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("deleteShoppingList", () => {
  describe("success", () => {
    test("deletes a shopping list", async ({ trpc, user }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await trpc.shoppingLists.deleteShoppingList({
        id: shoppingList.id,
      });

      const deletedShoppingList = await prisma.shoppingList.findUnique({
        where: { id: shoppingList.id },
      });
      expect(deletedShoppingList).toEqual(null);
    });
  });

  describe("error", () => {
    test("throws when the shopping list does not exist", async ({ trpc }) => {
      await expect(
        trpc.shoppingLists.deleteShoppingList({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you do not own it",
      );
    });

    test("throws when the calling user is only a collaborator", async ({
      trpc2,
      user,
      user2,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
          collaboratorUsers: {
            createMany: {
              data: [{ userId: user2.id }],
            },
          },
        },
      });

      await expect(
        trpc2.shoppingLists.deleteShoppingList({
          id: shoppingList.id,
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you do not own it",
      );
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
        trpc2.shoppingLists.deleteShoppingList({
          id: shoppingList.id,
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you do not own it",
      );
    });
  });
});
