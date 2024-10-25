import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("getLabelGroups", () => {
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
    it("get label groups", async () => {
      await prisma.labelGroup.create({
        data: {
          title: "meat",
          userId: user.id,
          warnWhenNotPresent: true,
        },
      });
      const response = await trpc.labelGroups.getLabelGroups.query();
      expect(response[0].title).toEqual("meat");
    });

    it("does not find a label group", async () => {
      const response = await trpc2.labelGroups.getLabelGroups.query();
      expect(response.length).toEqual(0);
    });
  });
});
