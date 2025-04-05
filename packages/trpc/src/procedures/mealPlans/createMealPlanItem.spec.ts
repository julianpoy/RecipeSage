import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("createMealPlanItem", () => {
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
    it("creates a meal plan item", async () => {
      const collaboratorUsers = [user2];
      const mealPlan = await prisma.mealPlan.create({
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
      expect(typeof mealPlan?.id).toBe("string");
      const mealPlanItem = await trpc.mealPlans.createMealPlanItem.mutate({
        mealPlanId: mealPlan.id,
        title: "Protein",
        scheduledDate: "2024-05-26",
        meal: "dinner",
        recipeId: null,
      });
      expect(typeof mealPlanItem?.id).toBe("string");
      const updatedMealPlanItem = await prisma.mealPlanItem.findUnique({
        where: {
          id: mealPlanItem.id,
        },
      });
      expect(updatedMealPlanItem?.title).toEqual("Protein");
    });
  });
  describe("error", () => {
    it("must throw on meal plan not found", async () => {
      return expect(async () => {
        await trpc.mealPlans.createMealPlanItem.mutate({
          mealPlanId: "00008495-d189-4a99-98bb-8888442de945",
          title: "Protein",
          scheduledDate: "2024-05-26",
          meal: "dinner",
          recipeId: null,
        });
      }).rejects.toThrow(
        "Meal plan with that id does not exist or you do not have access",
      );
    });
  });
});
