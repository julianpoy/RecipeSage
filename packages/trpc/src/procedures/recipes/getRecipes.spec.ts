import { trpcSetup, tearDown, createTrpcClient } from "../../testutils";
import { recipeFactory } from "../../factories/recipeFactory";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("getRecipes", () => {
  let user: User;
  let user2: User;
  let trpc: TRPCClient<AppRouter>;

  beforeEach(async () => {
    ({ user, user2, trpc } = await trpcSetup());
  });

  afterEach(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("returns a list of recipes given no filters", async () => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
        },
      });

      const response = await trpc.recipes.getRecipes.query({
        limit: 3,
        folder: "main",
        orderBy: "title",
        orderDirection: "asc",
        offset: 0,
      });

      expect(typeof response.recipes[0].id).toBe("string");
    });

    it("filters by ratings", async () => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          rating: 1,
        },
      });

      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          rating: 5,
        },
      });

      const response = await trpc.recipes.getRecipes.query({
        userIds: [user.id],
        ratings: [5],
        limit: 3,
        folder: "main",
        orderBy: "title",
        orderDirection: "asc",
        offset: 0,
      });

      expect(response.totalCount).toEqual(1);
      expect(response.recipes[0].rating).toEqual(5);
    });

    it("filters by labels", async () => {
      const label = await prisma.label.create({
        data: {
          title: faker.string.alphanumeric(10),
          userId: user.id,
          labelGroupId: null,
        },
      });

      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "myTitle",
          recipeLabels: {
            createMany: {
              data: [{ labelId: label.id }],
            },
          },
          rating: faker.number.int({ min: 1, max: 5 }),
        },
      });

      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
        },
      });

      const response = await trpc.recipes.getRecipes.query({
        userIds: [user.id],
        labels: [label.title],
        limit: 3,
        folder: "main",
        orderBy: "title",
        orderDirection: "asc",
        offset: 0,
      });

      expect(response.totalCount).toEqual(1);
      expect(response.recipes[0].title).toEqual("myTitle");
    });
  });
});

describe("error", () => {
  it("invalid session", async () => {
    const trpcNotLoggedIn = await createTrpcClient("12345");
    return expect(async () => {
      await trpcNotLoggedIn.recipes.getRecipes.query({
        limit: 3,
        folder: "main",
        orderBy: "title",
        orderDirection: "asc",
        offset: 0,
      });
    }).rejects.toThrow("Must pass userIds or be logged in");
  });
});
