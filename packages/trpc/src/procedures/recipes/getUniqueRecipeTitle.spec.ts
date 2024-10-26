import { trpcSetup, tearDown } from "../../testutils";
import { recipeFactory } from "../../factories/recipeFactory";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("getUniqueRecipeTitle", () => {
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
    it("gets a unique recipe title", async () => {
      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Spagetti",
        },
      });

      const response = await trpc.recipes.getUniqueRecipeTitle.query({
        title: "Spagetti",
      });
      expect(response).toEqual("Spagetti (1)");

      await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "Spagetti (1)",
        },
      });
      const response2 = await trpc.recipes.getUniqueRecipeTitle.query({
        title: "Spagetti",
      });

      expect(response2).toEqual("Spagetti (2)");
    });
  });

  it("gets a unique recipe title with ignoring ID", async () => {
    await prisma.recipe.create({
      data: {
        ...recipeFactory(user.id),
        title: "Spagetti with meatballs",
      },
    });

    const recipe2 = await prisma.recipe.create({
      data: {
        ...recipeFactory(user.id),
        title: "Spagetti with meatballs (1)",
      },
    });
    const response2 = await trpc.recipes.getUniqueRecipeTitle.query({
      title: "Spagetti with meatballs",
      ignoreIds: [recipe2.id],
    });
    expect(response2).toEqual("Spagetti with meatballs (1)");
  });

  it("seperate recipies by user", async () => {
    const { user: user2, user2: user3 } = await trpcSetup();
    await prisma.recipe.create({
      data: {
        ...recipeFactory(user2.id),
        title: "Spagetti with tomatos",
      },
    });

    const response = await trpc.recipes.getUniqueRecipeTitle.query({
      title: "Spagetti with tomatos",
    });
    expect(response).toEqual("Spagetti with tomatos");

    return tearDown(user2.id, user3.id);
  });
});
