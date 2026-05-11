import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("createMealPlan", () => {
  describe("success", () => {
    test("creates a meal plan with collaborators", async ({
      trpc,
      user,
      user2,
    }) => {
      const response = await trpc.mealPlans.createMealPlan({
        title: "Protein",
        collaboratorUserIds: [user2.id],
      });

      const mealPlan = await prisma.mealPlan.findUnique({
        where: { id: response.id },
        include: { collaboratorUsers: true },
      });
      expect(mealPlan?.title).toEqual("Protein");
      expect(mealPlan?.userId).toEqual(user.id);
      expect(mealPlan?.collaboratorUsers.map((c) => c.userId)).toEqual([
        user2.id,
      ]);
    });
  });

  describe("error", () => {
    test("throws when a collaborator user id is invalid", async ({ trpc }) => {
      await expect(
        trpc.mealPlans.createMealPlan({
          title: "Protein",
          collaboratorUserIds: ["00000ca5-50e7-4144-bc11-e82925837a14"],
        }),
      ).rejects.toThrow(
        "One or more of the collaborators you specified are not valid",
      );
    });
  });
});
