import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("getLabelsByUserId", () => {
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
    it("get label by userId", async () => {
      const label = await prisma.label.create({
        data: {
          userId: user.id,
          title: "meat",
        },
      });
      const response = await trpc.labels.getLabelsByUserId.query({
        userIds: [user.id],
      });
      expect(response[0].id).toEqual(label.id);
    });
  });
  it("fails to get lebels with differrent user", async () => {
    const { user: user2, trpc: trpc2 } = await trpcSetup();
    await prisma.label.create({
      data: {
        userId: user.id,
        title: "fish",
      },
    });
    const response = await trpc2.labels.getLabelsByUserId.query({
      userIds: [user2.id],
    });
    expect(response.length).toEqual(0);
  });
});
