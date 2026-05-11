import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("updateMealPlan", () => {
  describe("success", () => {
    test("updates the meal plan's title", async ({ trpc, user, user2 }) => {
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

      await trpc.mealPlans.updateMealPlan({
        title: "not protein",
        id: mealPlan.id,
        collaboratorUserIds: [user2.id],
      });

      const updatedMealPlan = await prisma.mealPlan.findUnique({
        where: { id: mealPlan.id },
      });
      expect(updatedMealPlan?.title).toEqual("not protein");
    });
  });

  describe("error", () => {
    test("throws when the meal plan does not exist", async ({ trpc, user }) => {
      await expect(
        trpc.mealPlans.updateMealPlan({
          id: "00000000-0c70-4718-aacc-05add19096b5",
          title: "Protein",
          collaboratorUserIds: [user.id],
        }),
      ).rejects.toThrow("Meal plan not found or you do not own it");
    });

    test("throws when the calling user is only a collaborator", async ({
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

      await expect(
        trpc2.mealPlans.updateMealPlan({
          id: mealPlan.id,
          title: "Protein",
          collaboratorUserIds: [user2.id],
        }),
      ).rejects.toThrow("Meal plan not found or you do not own it");
    });
  });
});
