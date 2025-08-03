import { trpcSetup, tearDown } from "../../testutils";
import { recipeFactory } from "../../factories/recipeFactory";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";
import { faker } from "@faker-js/faker";

describe("deleteMealOption", () => {
  let user: User;
  let user2: User;
  let trpc: TRPCClient<AppRouter>;

  beforeAll(async () => {
    ({ user, user2, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("deletes a label", async () => {
      const label = await prisma.label.create({
        data: {
          userId: user.id,
          title: "eggs",
        },
      });
      const response = await trpc.labels.deleteLabel.mutate({
        id: label.id,
      });

      expect(response.labelGroup).toEqual(null);
      const updatedLabel = await prisma.label.findUnique({
        where: {
          id: label.id,
        },
      });
      expect(updatedLabel).toEqual(null);
    });

    it("deletes label with attached recipies", async () => {
      const label = await prisma.label.create({
        data: {
          title: "eggs",
          userId: user.id,
          labelGroupId: null,
        },
      });

      const recipe = await prisma.recipe.create({
        data: {
          ...recipeFactory(user.id),
          title: "boiled egg",
          recipeLabels: {
            createMany: {
              data: [{ labelId: label.id }],
            },
          },
          rating: faker.number.int({ min: 1, max: 5 }),
        },
      });

      const response = await trpc.labels.deleteLabel.mutate({
        id: label.id,
        includeAttachedRecipes: true,
      });
      expect(response.labelGroup).toEqual(null);

      const updatedRecipe = await prisma.recipe.findUnique({
        where: {
          id: recipe.id,
        },
      });

      expect(updatedRecipe).toEqual(null);
    });
  });
  describe("error", () => {
    it("must throw on label not found", async () => {
      return expect(async () => {
        await trpc.labels.deleteLabel.mutate({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        });
      }).rejects.toThrow("Label not found");
    });
  });
});
