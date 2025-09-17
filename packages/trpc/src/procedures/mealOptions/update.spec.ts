import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("updateMealOption", () => {
  let user: User;
  let user2: User;
  let trpc: TRPCClient<AppRouter>;

  beforeEach(async () => {
    ({ user, user2, trpc } = await trpcSetup());
  });

  afterEach(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("updates meal option", async () => {
      const title = "breakfast";
      const mealTime = "12:00";
      const newTitle = "lunch";
      const newMealTime = "13:00";

      const option = await prisma.mealOption.create({
        data: {
          userId: user.id,
          title: title,
          mealTime: mealTime,
        },
      });

      const response = await trpc.mealOptions.update.mutate({
        id: option.id,
        title: newTitle,
        mealTime: newMealTime,
      });

      expect(response.title).toEqual(newTitle);

      const updatedOption = await prisma.mealOption.findUnique({
        where: {
          id: option.id,
        },
      });

      expect(updatedOption?.title).toEqual(newTitle);
      expect(updatedOption?.mealTime).toEqual(newMealTime);
    });
  });

  describe("error", () => {
    it("throws on conflicting meal option title and time", async () => {
      return expect(async () => {
        const title = "breakfast";
        const mealTime = "12:00";

        const option = await prisma.mealOption.create({
          data: {
            userId: user.id,
            title: title,
            mealTime: mealTime,
          },
        });

        await prisma.mealOption.create({
          data: {
            userId: user.id,
            title: title,
            mealTime: mealTime,
          },
        });

        await trpc.mealOptions.update.mutate({
          id: option.id,
          title: title,
          mealTime: mealTime,
        });
      }).rejects.toThrow("Conflicting meal option title and time");
    });
  });
});
