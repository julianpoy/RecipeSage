import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("createRecipe", () => {
  let user: User;
  let trpc: CreateTRPCProxyClient<AppRouter>;

  beforeAll(async () => {
    ({ user, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id);
  });

  it("creates a recipe with all parameters provided", async () => {
    const recipe = await trpc.recipes.createRecipe.mutate({
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
      labelIds: [],
      imageIds: [],
    });

    expect(typeof recipe.id).toBe("string");
    const response = await prisma.recipe.findUnique({
      where: {
        id: recipe.id,
      },
    });
    expect(typeof response?.id).toBe("string");
  });
});
