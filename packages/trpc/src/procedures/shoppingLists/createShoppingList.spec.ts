import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("createShoppingList", () => {
  describe("success", () => {
    test("creates a shopping list with no collaborators", async ({
      trpc,
      user,
    }) => {
      const title = faker.string.alphanumeric(10);

      const response = await trpc.shoppingLists.createShoppingList({
        title,
        collaboratorUserIds: [],
      });

      const shoppingList = await prisma.shoppingList.findUnique({
        where: { id: response.id },
      });
      expect(shoppingList?.title).toEqual(title);
      expect(shoppingList?.userId).toEqual(user.id);
    });

    test("creates a shopping list with collaborators", async ({
      trpc,
      user2,
    }) => {
      const response = await trpc.shoppingLists.createShoppingList({
        title: faker.string.alphanumeric(10),
        collaboratorUserIds: [user2.id],
      });

      const collaborators = await prisma.shoppingListCollaborator.findMany({
        where: { shoppingListId: response.id },
      });
      expect(collaborators.length).toEqual(1);
      expect(collaborators[0].userId).toEqual(user2.id);
    });
  });

  describe("error", () => {
    test("throws when a collaborator user id is invalid", async ({ trpc }) => {
      await expect(
        trpc.shoppingLists.createShoppingList({
          title: faker.string.alphanumeric(10),
          collaboratorUserIds: ["00000000-0c70-4718-aacc-05add19096b5"],
        }),
      ).rejects.toThrow(
        "One or more of the collaborators you specified are not valid",
      );
    });
  });
});
