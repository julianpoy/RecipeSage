import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("upsertShoppingListItems", () => {
  describe("success", () => {
    test("creates new items when ids do not exist", async ({ trpc, user }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      const newId = crypto.randomUUID();
      await trpc.shoppingLists.upsertShoppingListItems({
        shoppingListId: shoppingList.id,
        items: [
          {
            id: newId,
            title: "Apples",
            recipeId: null,
            categoryTitle: "Produce",
            updatedAt: new Date(),
          },
        ],
      });

      const created = await prisma.shoppingListItem.findUnique({
        where: { id: newId },
      });
      expect(created?.title).toEqual("Apples");
      expect(created?.shoppingListId).toEqual(shoppingList.id);
      expect(created?.userId).toEqual(user.id);
    });

    test("updates existing items when the incoming updatedAt is newer", async ({
      trpc,
      user,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const originalUpdatedAt = new Date(Date.now() - 60000);
      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
          updatedAt: originalUpdatedAt,
        },
      });

      await trpc.shoppingLists.upsertShoppingListItems({
        shoppingListId: shoppingList.id,
        items: [
          {
            id: item.id,
            title: "Pears",
            recipeId: null,
            completed: true,
            categoryTitle: "Produce",
            updatedAt: new Date(),
          },
        ],
      });

      const updated = await prisma.shoppingListItem.findUnique({
        where: { id: item.id },
      });
      expect(updated?.title).toEqual("Pears");
      expect(updated?.completed).toEqual(true);
      expect(
        (updated?.updatedAt.getTime() ?? 0) > originalUpdatedAt.getTime(),
      ).toEqual(true);
    });

    test("updates existing items when the incoming updatedAt equals the stored one", async ({
      trpc,
      user,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });
      const sharedUpdatedAt = new Date(Date.now() - 60000);
      const item = await prisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          userId: user.id,
          title: "Apples",
          completed: false,
          categoryTitle: "::uncategorized",
          updatedAt: sharedUpdatedAt,
        },
      });

      await trpc.shoppingLists.upsertShoppingListItems({
        shoppingListId: shoppingList.id,
        items: [
          {
            id: item.id,
            title: "Pears",
            recipeId: null,
            categoryTitle: "Produce",
            updatedAt: sharedUpdatedAt,
          },
        ],
      });

      const updated = await prisma.shoppingListItem.findUnique({
        where: { id: item.id },
      });
      expect(updated?.title).toEqual("Pears");
    });

    test("does not overwrite items with a stale updatedAt", async ({
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

      await trpc.shoppingLists.upsertShoppingListItems({
        shoppingListId: shoppingList.id,
        items: [
          {
            id: item.id,
            title: "Pears",
            recipeId: null,
            categoryTitle: "Produce",
            updatedAt: new Date(Date.now() - 60000),
          },
        ],
      });

      const fetched = await prisma.shoppingListItem.findUnique({
        where: { id: item.id },
      });
      expect(fetched?.title).toEqual("Apples");
    });
  });

  describe("error", () => {
    test("throws when the shopping list does not exist", async ({ trpc }) => {
      await expect(
        trpc.shoppingLists.upsertShoppingListItems({
          shoppingListId: "00000000-0c70-4718-aacc-05add19096b5",
          items: [
            {
              id: crypto.randomUUID(),
              title: "Apples",
              recipeId: null,
              categoryTitle: "Produce",
              updatedAt: new Date(),
            },
          ],
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
        trpc2.shoppingLists.upsertShoppingListItems({
          shoppingListId: shoppingList.id,
          items: [
            {
              id: crypto.randomUUID(),
              title: "Apples",
              recipeId: null,
              categoryTitle: "Produce",
              updatedAt: new Date(),
            },
          ],
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });

    test("throws when an existing item belongs to a different shopping list", async ({
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
        trpc.shoppingLists.upsertShoppingListItems({
          shoppingListId: shoppingList.id,
          items: [
            {
              id: otherItem.id,
              title: "Pears",
              recipeId: null,
              categoryTitle: "Produce",
              updatedAt: new Date(),
            },
          ],
        }),
      ).rejects.toThrow(
        "One of the items you've passed does not not belong to the shopping list id you're updating",
      );
    });
  });
});
