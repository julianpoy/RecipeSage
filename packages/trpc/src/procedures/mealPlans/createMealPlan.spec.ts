import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("createMealPlan", () => {
  let user: User;
  let user2: User;
  let trpc: CreateTRPCProxyClient<AppRouter>;

  beforeAll(async () => {
    ({ user, user2, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("creates a meal plan", async () => {
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
      expect(typeof response?.id).toBe("string");

      const updatedMealPlan = await prisma.mealPlan.findUnique({
        where: {
          id: response.id,
        },
      });
      expect(updatedMealPlan?.title).toEqual("Protein");
    });
  });
  describe("error", () => {
    it("must throw on meal plan not found", async () => {
      return expect(async () => {
        await trpc.mealPlans.createMealPlan.mutate({
          title: "Protein",
          collaboratorUserIds: ["00000ca5-50e7-4144-bc11-e82925837a14"],
        });
      }).rejects.toThrow(
        "One or more of the collaborators you specified are not valid",
      );
    });
  });
});
