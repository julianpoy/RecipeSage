import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("deleteMealPlan", () => {
  let user: User;
  let user2: User;
  let trpc: TRPCClient<AppRouter>;
  let trpc2: TRPCClient<AppRouter>;

  beforeAll(async () => {
    ({ user, user2, trpc, trpc2 } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("deletes a meal plan", async () => {
      const collaboratorUsers = [user2];
      const response = await prisma.mealPlan.create({
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

      await trpc.mealPlans.deleteMealPlan.mutate({
        id: response.id,
      });

      const updatedResponse = await prisma.mealPlan.findUnique({
        where: {
          id: response.id,
        },
      });
      expect(updatedResponse).toEqual(null);
    });
  });
  describe("error", () => {
    it("must throw on meal plan not found", async () => {
      await trpc.mealPlans.createMealPlan.mutate({
        title: "Protein",
        collaboratorUserIds: [user2.id],
      });
      return expect(async () => {
        await trpc.mealPlans.deleteMealPlan.mutate({
          id: "00000ca5-50e7-4144-bc11-e82925837a14",
        });
      }).rejects.toThrow(
        "Meal plan with that id does not exist or you do not own it",
      );
    });

    it("must throw on meal plan not owned", async () => {
      const response = await trpc.mealPlans.createMealPlan.mutate({
        title: "Protein",
        collaboratorUserIds: [user2.id],
      });
      return expect(async () => {
        await trpc2.mealPlans.deleteMealPlan.mutate({
          id: response.id,
        });
      }).rejects.toThrow(
        "Meal plan with that id does not exist or you do not own it",
      );
    });
  });
});
