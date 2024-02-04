import { trpcSetup, tearDown, createTrpcClient, getRecipeStats } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("getRecipes", () => {
  jest.setTimeout(50000);
  let user: User;
  let trpc: CreateTRPCProxyClient<AppRouter>;

  beforeAll(async () => {
    ({ user, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id);
  });

  it("returns a list of recipes given no filters", async () => {
    await prisma.recipe.create({
      data: {
        ...getRecipeStats(user.id),
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
        ...getRecipeStats(user.id),
        rating: 3,
      },
    });

    await prisma.recipe.create({
      data: {
        ...getRecipeStats(user.id),
        rating: 4,
      },
    });

    const response = await trpc.recipes.getRecipes.query({
      userIds: [user.id],
      ratings: [3],
      limit: 3,
      folder: "main",
      orderBy: "title",
      orderDirection: "asc",
      offset: 0,
    });

    expect(response.totalCount).toEqual(1);
    expect(response.recipes[0].rating).toEqual(3);
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
        ...getRecipeStats(user.id),
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
        ...getRecipeStats(user.id),
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

describe("getRecipes - error cases", () => {
  jest.setTimeout(50000);
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
