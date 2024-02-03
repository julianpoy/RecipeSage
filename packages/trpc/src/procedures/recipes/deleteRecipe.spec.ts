import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("deleteRecipe", () => {
  let user: User;
  let trpc: CreateTRPCProxyClient<AppRouter>;

  beforeAll(async () => {
    ({ user, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id);
  });

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
