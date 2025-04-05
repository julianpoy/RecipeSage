import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("deleteLabelGroup", () => {
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
    it("deletes a label group with all parameters provided", async () => {
      const labelGroup = await prisma.labelGroup.create({
        data: {
          title: "soup",
          userId: user.id,
          warnWhenNotPresent: true,
        },
      });
      const labelGroupD = await trpc.labelGroups.deleteLabelGroup.mutate({
        id: labelGroup.id,
      });

      const updatedLabelGroup = await prisma.labelGroup.findUnique({
        where: {
          id: labelGroupD.id,
        },
      });
      expect(updatedLabelGroup).toEqual(null);
    });
  });

  describe("error", () => {
    it("must throw on label group not found", async () => {
      await prisma.labelGroup.create({
        data: {
          title: "Fish",
          userId: user.id,
          warnWhenNotPresent: true,
        },
      });
      return expect(async () => {
        await trpc.labelGroups.deleteLabelGroup.mutate({
          id: "00000ca5-50e7-4144-bc11-e82925837a14",
        });
      }).rejects.toThrow("Label group not found");
    });
  });
});
