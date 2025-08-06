import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("createMealOption", () => {
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
    it("creates meal option with all parameters provided", async () => {
      const mealTitle = "lunch";
      const mealTime = "12:00";

      const mealOption = await trpc.mealOptions.create.mutate({
        title: mealTitle,
        mealTime: mealTime,
      });
      expect(typeof mealOption.id).toBe("string");
      const response = await prisma.mealOption.findFirst({
        where: {
          id: mealOption.id,
        },
      });
      expect(typeof response?.id).toBe("string");

      const updatedMealOption = await prisma.mealOption.findUnique({
        where: {
          id: mealOption.id,
        },
      });
      expect(updatedMealOption?.title).toEqual(mealTitle);
      expect(updatedMealOption?.mealTime).toEqual(mealTime);
    });
  });

  describe("error", () => {
    it("must throw conflicting meal option", async () => {
      const mealTitle = "lunch";
      const mealTime = "12:00";

      await trpc.mealOptions.create.mutate({
        title: mealTitle,
        mealTime: mealTime,
      });

      return expect(async () => {
        await trpc.mealOptions.create.mutate({
          title: mealTitle,
          mealTime: mealTime,
        });
      }).rejects.toThrow("Conflicting meal option");
    });
  });
  
});
