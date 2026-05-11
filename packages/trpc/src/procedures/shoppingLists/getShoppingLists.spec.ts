import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("getShoppingLists", () => {
  describe("success", () => {
    test("returns owned shopping lists", async ({ trpc, user }) => {
      const ownedTitle = faker.string.alphanumeric(10);
      await prisma.shoppingList.create({
        data: {
          title: ownedTitle,
          userId: user.id,
        },
      });

      const response = await trpc.shoppingLists.getShoppingLists();
      expect(response.length).toEqual(1);
      expect(response[0].title).toEqual(ownedTitle);
    });

    test("returns shopping lists where the user is a collaborator", async ({
      trpc2,
      user,
      user2,
    }) => {
      const sharedTitle = faker.string.alphanumeric(10);
      await prisma.shoppingList.create({
        data: {
          title: sharedTitle,
          userId: user.id,
          collaboratorUsers: {
            createMany: {
              data: [{ userId: user2.id }],
            },
          },
        },
      });

      const response = await trpc2.shoppingLists.getShoppingLists();
      expect(response.length).toEqual(1);
      expect(response[0].title).toEqual(sharedTitle);
    });

    test("returns an empty array when the user has none", async ({ trpc }) => {
      const response = await trpc.shoppingLists.getShoppingLists();
      expect(response.length).toEqual(0);
    });

    test("does not return shopping lists owned by other users without a collaborator relationship", async ({
      trpc2,
      user,
    }) => {
      await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      const response = await trpc2.shoppingLists.getShoppingLists();
      expect(response.length).toEqual(0);
    });
  });
});
