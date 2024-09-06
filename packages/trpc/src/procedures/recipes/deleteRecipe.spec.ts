import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("deleteRecipe", () => {
  let user: User;
  let user2: User;
  let trpc: CreateTRPCProxyClient<AppRouter>;

  beforeAll(async () => {
    ({ user, user2, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("deletes a recipe", async () => {
      const recipe = await prisma.recipe.create({
        data: {
          userId: user.id,
          title: faker.string.alphanumeric(10),
          description: faker.string.alphanumeric(10),
          yield: faker.string.alphanumeric(10),
          folder: "inbox",
          activeTime: faker.string.alphanumeric(10),
          totalTime: faker.string.alphanumeric(10),
          source: faker.string.alphanumeric(10),
          url: faker.string.alphanumeric(10),
          notes: faker.string.alphanumeric(10),
          ingredients: faker.string.alphanumeric(10),
          instructions: faker.string.alphanumeric(10),
          rating: faker.number.int({ min: 1, max: 5 }),
        },
      });

      const response = await trpc.recipes.deleteRecipe.mutate({
        id: recipe.id,
      });

      expect(response).toEqual("Ok");

      const response2 = await prisma.recipe.findUnique({
        where: {
          id: recipe.id,
        },
      });
      expect(response2).toEqual(null);
    });
  });

  describe("error", () => {
    it("must throw on recipe not found", async () => {
      return expect(async () => {
        await trpc.recipes.deleteRecipe.mutate({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        });
      }).rejects.toThrow("Recipe not found");
    });

    it("must throw on invalid ownership", async () => {
      const { user: user2 } = await trpcSetup();

      const recipe = await prisma.recipe.create({
        data: {
          userId: user2.id,
          title: faker.string.alphanumeric(10),
          description: faker.string.alphanumeric(10),
          yield: faker.string.alphanumeric(10),
          folder: "inbox",
          activeTime: faker.string.alphanumeric(10),
          totalTime: faker.string.alphanumeric(10),
          source: faker.string.alphanumeric(10),
          url: faker.string.alphanumeric(10),
          notes: faker.string.alphanumeric(10),
          ingredients: faker.string.alphanumeric(10),
          instructions: faker.string.alphanumeric(10),
          rating: faker.number.int({ min: 1, max: 5 }),
        },
      });

      await expect(async () => {
        await trpc.recipes.deleteRecipe.mutate({
          id: recipe.id,
        });
      }).rejects.toThrow("Recipe not found");
    });
  });
});
