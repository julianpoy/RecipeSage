import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("deleteMealPlan", () => {
  describe("success", () => {
    test("deletes a meal plan", async ({ trpc, user, user2 }) => {
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

      await trpc.mealPlans.deleteMealPlan({
        id: mealPlan.id,
      });

      const deletedMealPlan = await prisma.mealPlan.findUnique({
        where: { id: mealPlan.id },
      });
      expect(deletedMealPlan).toEqual(null);
    });
  });

  describe("error", () => {
    test("throws when the meal plan does not exist", async ({ trpc }) => {
      await expect(
        trpc.mealPlans.deleteMealPlan({
          id: "00000ca5-50e7-4144-bc11-e82925837a14",
        }),
      ).rejects.toThrow(
        "Meal plan with that id does not exist or you do not own it",
      );
    });

    test("throws when the calling user is only a collaborator", async ({
      trpc,
      trpc2,
      user2,
    }) => {
      const mealPlan = await trpc.mealPlans.createMealPlan({
        title: "Protein",
        collaboratorUserIds: [user2.id],
      });

      await expect(
        trpc2.mealPlans.deleteMealPlan({
          id: mealPlan.id,
        }),
      ).rejects.toThrow(
        "Meal plan with that id does not exist or you do not own it",
      );
    });
  });
});
