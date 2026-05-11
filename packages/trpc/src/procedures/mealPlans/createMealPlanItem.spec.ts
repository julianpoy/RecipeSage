import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("createMealPlanItem", () => {
  describe("success", () => {
    test("creates a meal plan item", async ({ trpc, user, user2 }) => {
      const mealPlan = await prisma.mealPlan.create({
        data: {
          title: "Protein",
          userId: user.id,
          collaboratorUsers: {
            createMany: {
              data: [{ userId: user2.id }],
            },
          },
        },
      });

      const response = await trpc.mealPlans.createMealPlanItem({
        mealPlanId: mealPlan.id,
        title: "Protein",
        scheduledDate: "2024-05-26",
        meal: "dinner",
        recipeId: null,
      });

      const mealPlanItem = await prisma.mealPlanItem.findUnique({
        where: { id: response.id },
      });
      expect(mealPlanItem?.title).toEqual("Protein");
      expect(mealPlanItem?.mealPlanId).toEqual(mealPlan.id);
    });
  });

  describe("error", () => {
    test("throws when the meal plan does not exist", async ({ trpc }) => {
      await expect(
        trpc.mealPlans.createMealPlanItem({
          mealPlanId: "00008495-d189-4a99-98bb-8888442de945",
          title: "Protein",
          scheduledDate: "2024-05-26",
          meal: "dinner",
          recipeId: null,
        }),
      ).rejects.toThrow(
        "Meal plan with that id does not exist or you do not have access",
      );
    });
  });
});
