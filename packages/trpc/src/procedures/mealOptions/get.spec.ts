import { trpcSetup, tearDown } from "../../testutils";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("getMealOptions", () => {
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

    const title = "breakfast";
    it("get meal options", async () => {
      await trpc.mealOptions.create.mutate({
        title: title,
        mealTime: "12:00",
      });

      const mealOption = await trpc.mealOptions.get.query();
      expect(mealOption[0].title).toEqual(title);
    });
  });
});
