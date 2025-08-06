import { trpcSetup, tearDown } from "../../testutils";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("deleteMealOption", () => {
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
    it("deletes a meal option", async () => {
      const mealTitle = "lunch";
      const mealTime = "12:00";

      const _mealOption = await trpc.mealOptions.create.mutate({
        title: mealTitle,
        mealTime: mealTime,
      });

      const mealOption = await trpc.mealOptions.remove.mutate({
        id: _mealOption.id,
      });

      expect(mealOption.mealTime).toEqual(null);
      const updatedMealOption = await trpc.mealOptions.get.query({
        title: _mealOption.id,
      });
      expect(updatedMealOption).toEqual(null);
    });
  });
  describe("error", () => {
    it("must throw on meal option not found", async () => {
      return expect(async () => {
        await trpc.mealOptions.remove.mutate({
          id: "00000000-0c70-4718-aacc-05add19096b5",
        });
      }).rejects.toThrow("Meal option not found");
    });
  });
});
