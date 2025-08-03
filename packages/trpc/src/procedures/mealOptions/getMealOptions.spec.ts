import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
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
    it("get meal options", async () => {
      await prisma.label.create({
        data: {
          userId: user.id,
          title: "breakfast",
        },
      });
      const response = await trpc.mealOptions.getMealOptions.query();
      expect(response[0].title).toEqual("breakfast");
    });

    it("throws on invalid ownership", async () => {
      const { user: user2 } = await trpcSetup();
      await prisma.label.create({
        data: {
          userId: user2.id,
          title: "meat",
        },
      });
      const response = await trpc.mealOptions.getMealOptions.query();
      expect(response.length).toEqual(0);
    });
  });
});
