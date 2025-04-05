import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("getMealPlan", () => {
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
    it("gets a meal plan", async () => {
      const collaboratorUsers = [user2];
      const createdMealPlan = await prisma.mealPlan.create({
        data: {
          title: "Protein",
          userId: user.id,
          collaboratorUsers: {
            createMany: {
              data: collaboratorUsers.map((collaboratorUser) => ({
                userId: collaboratorUser.id,
              })),
            },
          },
        },
      });

      const fetchedMealPlan = await trpc.mealPlans.getMealPlan.query({
        id: createdMealPlan.id,
      });
      expect(fetchedMealPlan.id).toEqual(createdMealPlan.id);
    });
  });
  describe("error", () => {
    it("throws when meal plan not found", async () => {
      return expect(async () => {
        await trpc.mealPlans.getMealPlan.query({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        });
      }).rejects.toThrow("Meal plan not found or you do not have access to it");
    });
    it("must throw on meal plan not owned", async () => {
      const collaboratorUsers = [user2];
      await prisma.mealPlan.create({
        data: {
          title: "Protein",
          userId: user.id,
          collaboratorUsers: {
            createMany: {
              data: collaboratorUsers.map((collaboratorUser) => ({
                userId: collaboratorUser.id,
              })),
            },
          },
        },
      });
      return expect(async () => {
        await trpc.mealPlans.getMealPlan.query({
          id: user2.id,
        });
      }).rejects.toThrow("Meal plan not found or you do not have access to it");
    });
  });
});
