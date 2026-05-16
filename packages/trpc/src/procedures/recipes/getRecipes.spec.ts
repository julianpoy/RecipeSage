import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { recipeFactory } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("getRecipes", () => {
  describe("success", () => {
    test("returns the calling user's recipes when no filters are given", async ({
      trpc,
      user,
    }) => {
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
        },
      });

      const response = await trpc.recipes.getRecipes({
        limit: 3,
        folder: "main",
        orderBy: "title",
        orderDirection: "asc",
        offset: 0,
      });

      expect(response.recipes.map((r) => r.id)).toEqual([recipe.id]);
    });

    test("filters by rating", async ({ trpc, user }) => {
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

      const response = await trpc.recipes.getRecipes({
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

    test("filters by label", async ({ trpc, user }) => {
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
        },
      });
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
        },
      });

      const response = await trpc.recipes.getRecipes({
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

  describe("error", () => {
    test("throws when the caller is not logged in and no userIds are given", async () => {
      await expect(
        anonymousTrpc.recipes.getRecipes({
          limit: 3,
          folder: "main",
          orderBy: "title",
          orderDirection: "asc",
          offset: 0,
        }),
      ).rejects.toThrow("Must pass userIds or be logged in");
    });
  });
});
