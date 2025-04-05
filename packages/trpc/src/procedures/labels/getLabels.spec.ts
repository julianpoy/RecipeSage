import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("getLabels", () => {
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
    it("get label", async () => {
      await prisma.label.create({
        data: {
          userId: user.id,
          title: "meat",
        },
      });
      const response = await trpc.labels.getLabels.query();
      expect(response[0].title).toEqual("meat");
    });

    it("throws on invalid ownership", async () => {
      const { user: user2 } = await trpcSetup();
      await prisma.label.create({
        data: {
          userId: user2.id,
          title: "meat",
        },
      });
      const response = await trpc.labels.getLabels.query();
      expect(response.length).toEqual(0);
    });
  });
});
