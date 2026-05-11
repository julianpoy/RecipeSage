import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("getShoppingListItems", () => {
  describe("success", () => {
    test("gets shopping list items as the owner", async ({ trpc, user }) => {
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

      const response = await trpc.shoppingLists.getShoppingListItems({
        shoppingListId: shoppingList.id,
      });

      expect(response.length).toEqual(1);
      expect(response[0].title).toEqual("Apples");
    });

    test("returns items ordered by createdAt descending", async ({
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
          createdAt: new Date(Date.now() - 60000),
        },
      });
      await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Bread",
          completed: false,
          categoryTitle: "::uncategorized",
          createdAt: new Date(),
        },
      });

      const response = await trpc.shoppingLists.getShoppingListItems({
        shoppingListId: shoppingList.id,
      });

      expect(response.length).toEqual(2);
      expect(response[0].title).toEqual("Bread");
      expect(response[1].title).toEqual("Apples");
    });

    test("gets shopping list items as a collaborator", async ({
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
      await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
        },
      });

      const response = await trpc2.shoppingLists.getShoppingListItems({
        shoppingListId: shoppingList.id,
      });
      expect(response.length).toEqual(1);
      expect(response[0].title).toEqual("Apples");
    });

    test("returns an empty array when the shopping list has no items", async ({
      trpc,
      user,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      const response = await trpc.shoppingLists.getShoppingListItems({
        shoppingListId: shoppingList.id,
      });
      expect(response.length).toEqual(0);
    });
  });

  describe("error", () => {
    test("throws when the shopping list does not exist", async ({ trpc }) => {
      await expect(
        trpc.shoppingLists.getShoppingListItems({
          shoppingListId: "00000000-0c70-4718-aacc-05add19096b5",
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
        trpc2.shoppingLists.getShoppingListItems({
          shoppingListId: shoppingList.id,
        }),
      ).rejects.toThrow("Shopping list not found or you do not have access");
    });
  });
});
