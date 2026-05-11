import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("deleteMealPlanItem", () => {
  describe("success", () => {
    test("deletes a meal plan item as the owner", async ({
      trpc,
      user,
      user2,
    }) => {
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

      await trpc.mealPlans.deleteMealPlanItem({
        id: mealPlanItem.id,
      });

      const deletedMealPlanItem = await prisma.mealPlanItem.findUnique({
        where: { id: mealPlanItem.id },
      });
      expect(deletedMealPlanItem).toEqual(null);
    });

    test("deletes a meal plan item as a collaborator", async ({
      trpc2,
      user,
      user2,
    }) => {
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

      await trpc2.mealPlans.deleteMealPlanItem({
        id: mealPlanItem.id,
      });

      const deletedMealPlanItem = await prisma.mealPlanItem.findUnique({
        where: { id: mealPlanItem.id },
      });
      expect(deletedMealPlanItem).toEqual(null);
    });
  });

  describe("error", () => {
    test("throws when the meal plan item does not exist", async ({ trpc }) => {
      await expect(
        trpc.mealPlans.deleteMealPlanItem({
          id: "00000ca5-50e7-4144-bc11-e82925837a14",
        }),
      ).rejects.toThrow("NOT_FOUND");
    });

    test("throws when the calling user has no access to the meal plan", async ({
      trpc2,
      user,
      user2,
    }) => {
      const mealPlan = await prisma.mealPlan.create({
        data: {
          title: "Protein",
          userId: user.id,
        },
      });
      const mealPlanItem = await prisma.mealPlanItem.create({
        data: {
          userId: user2.id,
          mealPlanId: mealPlan.id,
          title: "Protein",
          scheduledDate: "2024-05-27T04:00:00.000Z",
          meal: "dinner",
          recipeId: null,
        },
      });

      await expect(
        trpc2.mealPlans.deleteMealPlanItem({
          id: mealPlanItem.id,
        }),
      ).rejects.toThrow(
        "Meal plan with that id does not exist or you do not have access",
      );
    });
  });
});
