import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

function getRecipeStats(userId: string) {
  return {
    userId,
    title: faker.string.alphanumeric(10),
    description: faker.string.alphanumeric(10),
    yield: faker.string.alphanumeric(10),
    folder: "main",
    activeTime: faker.string.alphanumeric(10),
    totalTime: faker.string.alphanumeric(10),
    source: faker.string.alphanumeric(10),
    url: faker.string.alphanumeric(10),
    notes: faker.string.alphanumeric(10),
    ingredients: faker.string.alphanumeric(10),
    instructions: faker.string.alphanumeric(10),
    rating: faker.number.int({ min: 1, max: 5 }),
  };
}

describe("getRecipe", () => {
  jest.setTimeout(50000);
  let user: User;
  let trpc: CreateTRPCProxyClient<AppRouter>;

  beforeAll(async () => {
    ({ user, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id);
  });

  it("gets a valid recipe", async () => {
    const recipe = await prisma.recipe.create({
      data: {
        ...getRecipeStats(user.id),
      },
    });

    const response = await trpc.recipes.getRecipe.query({
      id: recipe.id,
    });

    expect(response.id).toEqual(recipe.id);
  });

  it("throws when recipe not found", async () => {
    expect(async () => {
      await trpc.recipes.getRecipe.query({
        id: "00000000-0c70-4718-aacc-05add19096b5",
      });
    }).rejects.toThrow("Recipe not found");
  });
});
