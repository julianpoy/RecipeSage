import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("getShoppingListsWithItems", () => {
  describe("success", () => {
    test("returns owned shopping lists with their items", async ({
      trpc,
      user,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      const response = await trpc.shoppingLists.getShoppingListsWithItems();

      expect(response.length).toEqual(1);
      expect(response[0].id).toEqual(shoppingList.id);
      expect(response[0].items.length).toEqual(1);
      expect(response[0].items[0].title).toEqual("Apples");
    });

    test("returns shopping lists where the user is a collaborator", async ({
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

      const response = await trpc2.shoppingLists.getShoppingListsWithItems();
      expect(response.length).toEqual(1);
      expect(response[0].id).toEqual(shoppingList.id);
    });

    test("returns an empty array when the user has none", async ({ trpc }) => {
      const response = await trpc.shoppingLists.getShoppingListsWithItems();
      expect(response.length).toEqual(0);
    });
  });
});
