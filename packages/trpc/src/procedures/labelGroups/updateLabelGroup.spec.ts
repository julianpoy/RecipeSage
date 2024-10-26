import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("updateLabelGroup", () => {
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
    it("updates label group", async () => {
      const label = await prisma.label.create({
        data: {
          userId: user.id,
          title: "meat",
        },
      });
      const labelGroup = await prisma.labelGroup.create({
        data: {
          userId: user.id,
          title: "meat",
          warnWhenNotPresent: true,
        },
      });

      const response = await trpc.labelGroups.updateLabelGroup.mutate({
        id: labelGroup.id,
        title: "fish",
        labelIds: [label.id],
        warnWhenNotPresent: true,
      });
      expect(response.title).toEqual("fish");

      const updatedLabelGroup = await prisma.labelGroup.findUnique({
        where: {
          id: labelGroup.id,
        },
      });
      expect(updatedLabelGroup?.title).toEqual("fish");

      const updatedLabel = await prisma.label.findUnique({
        where: {
          id: label.id,
        },
      });
      expect(updatedLabel?.title).toEqual("meat");
    });
  });

  describe("error", () => {
    it("throws on conflicting label group title", async () => {
      return expect(async () => {
        const labelGroup = await prisma.labelGroup.create({
          data: {
            userId: user.id,
            title: "pasta",
            warnWhenNotPresent: true,
          },
        });
        await prisma.labelGroup.create({
          data: {
            userId: user.id,
            title: "veggi",
            warnWhenNotPresent: true,
          },
        });
        await trpc.labelGroups.updateLabelGroup.mutate({
          id: labelGroup.id,
          title: "veggi",
          labelIds: [],
          warnWhenNotPresent: true,
        });
      }).rejects.toThrow("Conflicting labelGroup title");
    });
  });
});
