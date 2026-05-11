import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("updateMealPlanItem", () => {
  describe("success", () => {
    test("updates a meal plan item", async ({ trpc, user, user2 }) => {
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
      const mealPlanItem = await prisma.mealPlanItem.create({
        data: {
          userId: user.id,
          mealPlanId: mealPlan.id,
          title: "Protein",
          scheduledDate: "2024-05-27T04:00:00.000Z",
          meal: "dinner",
          recipeId: null,
        },
      });

      await trpc.mealPlans.updateMealPlanItem({
        id: mealPlanItem.id,
        title: "NoProtein",
        scheduledDate: "2024-05-28",
        meal: "dinner",
        recipeId: null,
      });

      const updatedMealPlanItem = await prisma.mealPlanItem.findUnique({
        where: { id: mealPlanItem.id },
      });
      expect(updatedMealPlanItem?.title).toEqual("NoProtein");
    });
  });

  describe("error", () => {
    test("throws when the meal plan item does not exist", async ({ trpc }) => {
      await expect(
        trpc.mealPlans.updateMealPlanItem({
          id: "00000ca5-50e7-4144-bc11-e82925837a14",
          title: "NoProtein",
          scheduledDate: "2024-05-28",
          meal: "dinner",
          recipeId: null,
        }),
      ).rejects.toThrow("NOT_FOUND");
    });
  });
});
