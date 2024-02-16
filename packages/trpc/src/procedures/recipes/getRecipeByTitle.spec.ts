import { trpcSetup, tearDown } from "../../testutils";
import { recipeFactory } from "../../factories/recipeFactory";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("getRecipe", () => {
  let user: User;
  let trpc: CreateTRPCProxyClient<AppRouter>;

  beforeAll(async () => {
    ({ user, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id);
  });

  describe("success", () => {
    it("gets a recipe with a title", async () => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Mexican chicken",
        },
      });

      const response = await trpc.recipes.getRecipesByTitle.query({
        title: "Mexican chicken",
      });
      expect(response.length).toEqual(1);
      expect(response[0].title).toEqual("Mexican chicken");
    });
  });

  describe("error", () => {
    it("fails to get recipe with a different title", async () => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Mexican espanadas",
        },
      });

      const response = await trpc.recipes.getRecipesByTitle.query({
        title: "Spanish pork",
      });
      expect(response.length).toEqual(0);
    });
  });

  it("fails to get a recipe with differrent user", async () => {
    const { user: user2 } = await trpcSetup();
    await prisma.recipe.create({
      data: {
        ...recipeFactory(user2.id),
        title: "caviar",
      },
    });

    const response = await trpc.recipes.getRecipesByTitle.query({
      title: "caviar",
    });
    expect(response.length).toEqual(0);

    return tearDown(user2.id);
  });
});
