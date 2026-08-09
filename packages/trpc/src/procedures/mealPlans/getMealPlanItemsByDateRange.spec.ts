import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("getMealPlanItemsByDateRange", () => {
  describe("success", () => {
    test("returns only items scheduled within the inclusive range", async ({
      trpc,
      user,
    }) => {
      const mealPlan = await prisma.mealPlan.create({
        data: {
          title: "Protein",
          userId: user.id,
        },
      });

      await prisma.mealPlanItem.createMany({
        data: [
          {
            userId: user.id,
            mealPlanId: mealPlan.id,
            title: "End of April",
            scheduledDate: new Date(Date.UTC(2024, 3, 30)),
            meal: "dinner",
          },
          {
            userId: user.id,
            mealPlanId: mealPlan.id,
            title: "Start of May",
            scheduledDate: new Date(Date.UTC(2024, 4, 1)),
            meal: "dinner",
          },
          {
            userId: user.id,
            mealPlanId: mealPlan.id,
            title: "End of June",
            scheduledDate: new Date(Date.UTC(2024, 5, 30)),
            meal: "dinner",
          },
          {
            userId: user.id,
            mealPlanId: mealPlan.id,
            title: "Start of July",
            scheduledDate: new Date(Date.UTC(2024, 6, 1)),
            meal: "dinner",
          },
        ],
      });

      const response = await trpc.mealPlans.getMealPlanItemsByDateRange({
        mealPlanId: mealPlan.id,
        startDate: "2024-05-01",
        endDate: "2024-06-30",
      });

      expect(response.map((item) => item.title).sort()).toEqual([
        "End of June",
        "Start of May",
      ]);
      expect(
        response.every(
          (item) =>
            item.scheduledDate >= "2024-05-01" &&
            item.scheduledDate <= "2024-06-30",
        ),
      ).toBe(true);
    });
  });

  describe("error", () => {
    test("throws when the meal plan does not exist", async ({ trpc }) => {
      await expect(
        trpc.mealPlans.getMealPlanItemsByDateRange({
          mealPlanId: "00000000-0c70-4718-aacc-05add19096b5",
          startDate: "2024-05-01",
          endDate: "2024-06-30",
        }),
      ).rejects.toThrow("Meal plan not found or you do not have access");
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
        trpc2.mealPlans.getMealPlanItemsByDateRange({
          mealPlanId: mealPlan.id,
          startDate: "2024-05-01",
          endDate: "2024-06-30",
        }),
      ).rejects.toThrow("Meal plan not found or you do not have access");
    });
  });
});
