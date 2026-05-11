import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("updateShoppingListItems", () => {
  describe("success", () => {
    test("updates multiple shopping list items", async ({ trpc, user }) => {
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

      await trpc.shoppingLists.updateShoppingListItems({
        shoppingListId: shoppingList.id,
        items: [
          {
            id: item1.id,
            title: "Pears",
            completed: true,
          },
          {
            id: item2.id,
            categoryTitle: "Bakery",
          },
        ],
      });

      const updated1 = await prisma.shoppingListItem.findUnique({
        where: { id: item1.id },
      });
      const updated2 = await prisma.shoppingListItem.findUnique({
        where: { id: item2.id },
      });
      expect(updated1?.title).toEqual("Pears");
      expect(updated1?.completed).toEqual(true);
      expect(updated2?.categoryTitle).toEqual("Bakery");
      expect(updated2?.title).toEqual("Bread");
    });
  });

  describe("error", () => {
    test("throws when one of the items does not exist", async ({
      trpc,
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
        trpc.shoppingLists.updateShoppingListItems({
          shoppingListId: shoppingList.id,
          items: [
            { id: item.id, title: "Pears" },
            {
              id: "00000000-0c70-4718-aacc-05add19096b5",
              title: "Bread",
            },
          ],
        }),
      ).rejects.toThrow(
        "One or more of the items you've passed do not exist, or do not belong to the shopping list id",
      );
    });

    test("throws when an item belongs to a different shopping list", async ({
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

      await expect(
        trpc.shoppingLists.updateShoppingListItems({
          shoppingListId: shoppingList.id,
          items: [{ id: otherItem.id, title: "Pears" }],
        }),
      ).rejects.toThrow(
        "One or more of the items you've passed do not exist, or do not belong to the shopping list id",
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
        trpc2.shoppingLists.updateShoppingListItems({
          shoppingListId: shoppingList.id,
          items: [{ id: item.id, title: "Pears" }],
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
