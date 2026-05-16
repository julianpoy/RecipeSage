import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("deleteShoppingListItem", () => {
  describe("success", () => {
    test("deletes a shopping list item", async ({ trpc, user }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const shoppingListItem = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      await trpc.shoppingLists.deleteShoppingListItem({
        id: shoppingListItem.id,
      });

      const deletedItem = await prisma.shoppingListItem.findUnique({
        where: { id: shoppingListItem.id },
      });
      expect(deletedItem).toEqual(null);
    });
  });

  describe("error", () => {
    test("throws when the shopping list item does not exist", async ({
      trpc,
    }) => {
      await expect(
        trpc.shoppingLists.deleteShoppingListItem({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow("NOT_FOUND");
    });

    test("throws when the user does not have access to the shopping list", async ({
      trpc2,
      user,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const shoppingListItem = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      await expect(
        trpc2.shoppingLists.deleteShoppingListItem({
          id: shoppingListItem.id,
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
