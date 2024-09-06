import { trpcSetup, tearDown } from "../../testutils";
import { recipeFactory } from "../../factories/recipeFactory";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("getRecipe", () => {
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
    it("gets a valid recipe", async () => {
      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
        },
      });

      const response = await trpc.recipes.getRecipe.query({
        id: recipe.id,
      });

      expect(response.id).toEqual(recipe.id);
    });
  });

  describe("error", () => {
    it("throws when recipe not found", async () => {
      return expect(async () => {
        await trpc.recipes.getRecipe.query({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        });
      }).rejects.toThrow("Recipe not found");
    });
  });
});
