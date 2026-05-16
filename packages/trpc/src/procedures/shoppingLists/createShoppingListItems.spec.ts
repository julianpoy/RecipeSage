import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("createShoppingListItems", () => {
  describe("success", () => {
    test("creates multiple shopping list items", async ({ trpc, user }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await trpc.shoppingLists.createShoppingListItems({
        shoppingListId: shoppingList.id,
        items: [
          {
            title: "Apples",
            recipeId: null,
            categoryTitle: "Produce",
          },
          {
            title: "Bread",
            recipeId: null,
            completed: true,
            categoryTitle: "Bakery",
          },
        ],
      });

      const items = await prisma.shoppingListItem.findMany({
        where: { shoppingListId: shoppingList.id },
      });
      expect(items.length).toEqual(2);
      const bread = items.find((el) => el.title === "Bread");
      expect(bread?.completed).toEqual(true);
      expect(bread?.categoryTitle).toEqual("Bakery");
    });
  });

  describe("error", () => {
    test("throws when the shopping list does not exist", async ({ trpc }) => {
      await expect(
        trpc.shoppingLists.createShoppingListItems({
          shoppingListId: "00000000-0c70-4718-aacc-05add19096b5",
          items: [
            {
              title: "Apples",
              recipeId: null,
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
        trpc2.shoppingLists.createShoppingListItems({
          shoppingListId: shoppingList.id,
          items: [
            {
              title: "Apples",
              recipeId: null,
            },
          ],
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you do not have access",
      );
    });
  });
});
