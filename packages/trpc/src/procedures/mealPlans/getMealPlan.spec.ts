import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("getMealPlan", () => {
  describe("success", () => {
    test("returns a meal plan", async ({ trpc, user, user2 }) => {
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

      const response = await trpc.mealPlans.getMealPlan({
        id: mealPlan.id,
      });
      expect(response.id).toEqual(mealPlan.id);
    });
  });

  describe("error", () => {
    test("throws when the meal plan does not exist", async ({ trpc }) => {
      await expect(
        trpc.mealPlans.getMealPlan({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        }),
      ).rejects.toThrow("Meal plan not found or you do not have access to it");
    });

    test("throws when the calling user has no access to the meal plan", async ({
      trpc2,
      user,
    }) => {
      const mealPlan = await prisma.mealPlan.create({
        data: {
          title: "Protein",
          userId: user.id,
        },
      });

      await expect(
        trpc2.mealPlans.getMealPlan({
          id: mealPlan.id,
        }),
      ).rejects.toThrow("Meal plan not found or you do not have access to it");
    });
  });
});
