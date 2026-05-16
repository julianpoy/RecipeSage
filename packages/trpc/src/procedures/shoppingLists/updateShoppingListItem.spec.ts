import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("updateShoppingListItem", () => {
  describe("success", () => {
    test("updates a shopping list item", async ({ trpc, user }) => {
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

      await trpc.shoppingLists.updateShoppingListItem({
        id: item.id,
        title: "Bread",
        completed: true,
        categoryTitle: "Bakery",
      });

      const updated = await prisma.shoppingListItem.findUnique({
        where: { id: item.id },
      });
      expect(updated?.title).toEqual("Bread");
      expect(updated?.completed).toEqual(true);
      expect(updated?.categoryTitle).toEqual("Bakery");
    });
  });

  describe("error", () => {
    test("throws when no properties are provided", async ({ trpc, user }) => {
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
        trpc.shoppingLists.updateShoppingListItem({
          id: item.id,
        }),
      ).rejects.toThrow("You must specify at least one property to update");
    });

    test("throws when the shopping list item does not exist", async ({
      trpc,
    }) => {
      await expect(
        trpc.shoppingLists.updateShoppingListItem({
          id: "00000000-0c70-4718-aacc-05add19096b5",
          title: "Bread",
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
        trpc2.shoppingLists.updateShoppingListItem({
          id: item.id,
          title: "Bread",
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
