import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("detachShoppingList", () => {
  describe("success", () => {
    test("removes the collaborator from the shopping list", async ({
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

      await trpc2.shoppingLists.detachShoppingList({
        id: shoppingList.id,
      });

      const collaborator = await prisma.shoppingListCollaborator.findUnique({
        where: {
          shoppingListId_userId: {
            shoppingListId: shoppingList.id,
            userId: user2.id,
          },
        },
      });
      expect(collaborator).toEqual(null);

      const fetched = await prisma.shoppingList.findUnique({
        where: { id: shoppingList.id },
      });
      expect(fetched?.id).toEqual(shoppingList.id);
    });
  });

  describe("error", () => {
    test("throws when the shopping list does not exist", async ({ trpc }) => {
      await expect(
        trpc.shoppingLists.detachShoppingList({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you are not a collaborator for it",
      );
    });

    test("throws when the user is the owner", async ({ trpc, user }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await expect(
        trpc.shoppingLists.detachShoppingList({
          id: shoppingList.id,
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you are not a collaborator for it",
      );
    });

    test("throws when the user has no relationship to the shopping list", async ({
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
        trpc2.shoppingLists.detachShoppingList({
          id: shoppingList.id,
        }),
      ).rejects.toThrow(
        "Shopping list with that id does not exist or you are not a collaborator for it",
      );
    });
  });
});
