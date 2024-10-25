import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("deleteMealPlanItem", () => {
  let user: User;
  let user2: User;
  let trpc: CreateTRPCProxyClient<AppRouter>;
  let trpc2: CreateTRPCProxyClient<AppRouter>;

  beforeAll(async () => {
    ({ user, user2, trpc, trpc2 } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("deletes a meal plan item", async () => {
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
      const mealPlanItemD = await trpc.mealPlans.deleteMealPlanItem.mutate({
        id: mealPlanItem.id,
      });

      const updatedMealPlanItem = await prisma.mealPlanItem.findUnique({
        where: {
          id: mealPlanItemD.id,
        },
      });
      expect(updatedMealPlanItem).toEqual(null);
    });
  });

  it("must throw on meal without access", async () => {
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
    const mealPlanItemD = await trpc2.mealPlans.deleteMealPlanItem.mutate({
      id: mealPlanItem.id,
    });
    const updatedMealPlanItem = await prisma.mealPlanItem.findUnique({
      where: {
        id: mealPlanItemD.id,
      },
    });
    expect(updatedMealPlanItem).toEqual(null);
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
        await trpc.mealPlans.deleteMealPlanItem.mutate({
          id: "00000ca5-50e7-4144-bc11-e82925837a14",
        });
      }).rejects.toThrow("NOT_FOUND");
    });
    it("must throw on meal without access", async () => {
      const mealPlan = await prisma.mealPlan.create({
        data: {
          title: "Protein",
          userId: user.id,
          collaboratorUsers: {
            createMany: {
              data: [],
            },
          },
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
      return expect(async () => {
        await trpc2.mealPlans.deleteMealPlanItem.mutate({
          id: mealPlanItem.id,
        });
      }).rejects.toThrow(
        "Meal plan with that id does not exist or you do not have access",
      );
    });
  });
});
