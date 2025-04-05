import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("updateMealPlanItem", () => {
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
    it("updates a meal plan item", async () => {
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
      const mealPlanItemU = await trpc.mealPlans.updateMealPlanItem.mutate({
        id: mealPlanItem.id,
        title: "NoProtein",
        scheduledDate: "2024-05-28",
        meal: "dinner",
        recipeId: null,
      });
      const updatedMealPlanItem = await prisma.mealPlanItem.findUnique({
        where: {
          id: mealPlanItemU.id,
        },
      });
      expect(updatedMealPlanItem?.title).toEqual("NoProtein");
    });

    describe("error", () => {
      it("must throw on meal plan not found", async () => {
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
          await trpc.mealPlans.updateMealPlanItem.mutate({
            id: "00000ca5-50e7-4144-bc11-e82925837a14",
            title: "NoProtein",
            scheduledDate: "2024-05-28",
            meal: "dinner",
            recipeId: null,
          });
        }).rejects.toThrow("NOT_FOUND");
      });
    });
  });
});
