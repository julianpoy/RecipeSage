import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("deleteShoppingListItems", () => {
  describe("success", () => {
    test("deletes multiple shopping list items", async ({ trpc, user }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const item1 = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });
      const item2 = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Bread",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      await trpc.shoppingLists.deleteShoppingListItems({
        shoppingListId: shoppingList.id,
        ids: [item1.id, item2.id],
      });

      const remaining = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: shoppingList.id },
      });
      expect(remaining.length).toEqual(0);
    });

    test("does not delete items belonging to a different shopping list", async ({
      trpc,
      user,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const otherShoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const otherItem = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: otherShoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      await trpc.shoppingLists.deleteShoppingListItems({
        shoppingListId: shoppingList.id,
        ids: [otherItem.id],
      });

      const fetched = await prisma.shoppingListItem.findUnique({
        where: { id: otherItem.id },
      });
      expect(fetched?.id).toEqual(otherItem.id);
    });
  });

  describe("error", () => {
    test("throws when the shopping list does not exist", async ({ trpc }) => {
      await expect(
        trpc.shoppingLists.deleteShoppingListItems({
          shoppingListId: "00000000-0c70-4718-aacc-05add19096b5",
          ids: ["00000000-0c70-4718-aacc-05add19096b6"],
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
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
      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      await expect(
        trpc2.shoppingLists.deleteShoppingListItems({
          shoppingListId: shoppingList.id,
          ids: [item.id],
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
