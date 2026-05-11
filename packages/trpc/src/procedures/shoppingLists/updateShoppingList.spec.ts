import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test } from "../../testutils";

describe("updateShoppingList", () => {
  describe("success", () => {
    test("updates the title of a shopping list", async ({ trpc, user }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await trpc.shoppingLists.updateShoppingList({
        id: shoppingList.id,
        title: "newtitle",
      });

      const updated = await prisma.shoppingList.findUnique({
        where: { id: shoppingList.id },
      });
      expect(updated?.title).toEqual("newtitle");
    });

    test("updates the categoryOrder of a shopping list", async ({
      trpc,
      user,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await trpc.shoppingLists.updateShoppingList({
        id: shoppingList.id,
        categoryOrder: "Produce,Bakery",
      });

      const updated = await prisma.shoppingList.findUnique({
        where: { id: shoppingList.id },
      });
      expect(updated?.categoryOrder).toEqual("Produce,Bakery");
    });

    test("clears the categoryOrder when null is passed", async ({
      trpc,
      user,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
          categoryOrder: "Produce,Bakery",
        },
      });

      await trpc.shoppingLists.updateShoppingList({
        id: shoppingList.id,
        categoryOrder: null,
      });

      const updated = await prisma.shoppingList.findUnique({
        where: { id: shoppingList.id },
      });
      expect(updated?.categoryOrder).toEqual(null);
    });

    test("updates title and collaborators in a single call", async ({
      trpc,
      user,
      user2,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await trpc.shoppingLists.updateShoppingList({
        id: shoppingList.id,
        title: "combined",
        collaboratorUserIds: [user2.id],
      });

      const updated = await prisma.shoppingList.findUnique({
        where: { id: shoppingList.id },
      });
      expect(updated?.title).toEqual("combined");

      const collaborators = await prisma.shoppingListCollaborator.findMany({
        where: { shoppingListId: shoppingList.id },
      });
      expect(collaborators.length).toEqual(1);
      expect(collaborators[0].userId).toEqual(user2.id);
    });

    test("updates collaborators by replacing the existing set", async ({
      trpc,
      user,
      user2,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await trpc.shoppingLists.updateShoppingList({
        id: shoppingList.id,
        collaboratorUserIds: [user2.id],
      });

      const collaborators = await prisma.shoppingListCollaborator.findMany({
        where: { shoppingListId: shoppingList.id },
      });
      expect(collaborators.length).toEqual(1);
      expect(collaborators[0].userId).toEqual(user2.id);

      await trpc.shoppingLists.updateShoppingList({
        id: shoppingList.id,
        collaboratorUserIds: [],
      });

      const collaboratorsAfter = await prisma.shoppingListCollaborator.findMany(
        {
          where: { shoppingListId: shoppingList.id },
        },
      );
      expect(collaboratorsAfter.length).toEqual(0);
    });
  });

  describe("error", () => {
    test("throws when the shopping list does not exist", async ({ trpc }) => {
      await expect(
        trpc.shoppingLists.updateShoppingList({
          id: "00000000-0c70-4718-aacc-05add19096b5",
          title: "newtitle",
        }),
      ).rejects.toThrow("Shopping list not found or you do not own it");
    });

    test("throws when the calling user is only a collaborator", async ({
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

      await expect(
        trpc2.shoppingLists.updateShoppingList({
          id: shoppingList.id,
          title: "newtitle",
        }),
      ).rejects.toThrow("Shopping list not found or you do not own it");
    });

    test("throws when a collaborator user id is invalid", async ({
      trpc,
      user,
    }) => {
      const shoppingList = await prisma.shoppingList.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
        },
      });

      await expect(
        trpc.shoppingLists.updateShoppingList({
          id: shoppingList.id,
          collaboratorUserIds: ["00000000-0c70-4718-aacc-05add19096b5"],
        }),
      ).rejects.toThrow(
        "One or more of the collaborators you specified are not valid",
      );
    });
  });
});
