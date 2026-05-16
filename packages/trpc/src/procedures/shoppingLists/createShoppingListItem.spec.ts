import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("createShoppingListItem", () => {
  describe("success", () => {
    test("creates a shopping list item", async ({ trpc, user }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      const response = await trpc.shoppingLists.createShoppingListItem({
        shoppingListId: shoppingList.id,
        title: "Apples",
        recipeId: null,
        categoryTitle: "Produce",
      });

      const item = await prisma.shoppingListItem.findUnique({
        where: { id: response.id },
      });
      expect(item?.title).toEqual("Apples");
      expect(item?.shoppingListId).toEqual(shoppingList.id);
      expect(item?.completed).toEqual(false);
    });

    test("creates a shopping list item as a collaborator", async ({
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

      const response = await trpc2.shoppingLists.createShoppingListItem({
        shoppingListId: shoppingList.id,
        title: "Bread",
        recipeId: null,
        completed: true,
        categoryTitle: "Bakery",
      });

      const item = await prisma.shoppingListItem.findUnique({
        where: { id: response.id },
      });
      expect(item?.userId).toEqual(user2.id);
      expect(item?.completed).toEqual(true);
      expect(item?.categoryTitle).toEqual("Bakery");
    });
  });

  describe("error", () => {
    test("throws when the shopping list does not exist", async ({ trpc }) => {
      await expect(
        trpc.shoppingLists.createShoppingListItem({
          shoppingListId: "00000000-0c70-4718-aacc-05add19096b5",
          title: "Apples",
          recipeId: null,
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

      await expect(
        trpc2.shoppingLists.createShoppingListItem({
          shoppingListId: shoppingList.id,
          title: "Apples",
          recipeId: null,
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
