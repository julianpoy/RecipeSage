import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { CreateTRPCProxyClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("createLabelGroup", () => {
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
    it("creates a label group with all parameters provided", async () => {
      const label = await prisma.label.create({
        data: {
          userId: user.id,
          title: "burger",
        },
      });
      const labelGroup = await trpc.labelGroups.createLabelGroup.mutate({
        title: "soup",
        labelIds: [label.id],
        warnWhenNotPresent: true,
      });
      expect(labelGroup.title).toEqual("soup");
      const response = await prisma.labelGroup.findFirst({
        where: {
          id: labelGroup.id,
        },
      });
      expect(typeof response?.id).toBe("string");

      const updatedLabelGroup = await prisma.labelGroup.findUnique({
        where: {
          id: labelGroup.id,
        },
      });
      expect(updatedLabelGroup?.title).toEqual("soup");
    });
  });

  it("creates a label group with two labels parameters provided", async () => {
    const label = await prisma.label.create({
      data: {
        userId: user.id,
        title: "meat",
      },
    });
    const label2 = await prisma.label.create({
      data: {
        userId: user2.id,
        title: "fish",
      },
    });
    const labelGroup = await trpc.labelGroups.createLabelGroup.mutate({
      title: "pizza",
      labelIds: [label.id, label2.id],
      warnWhenNotPresent: true,
    });
    expect(labelGroup.title).toEqual("pizza");
    const response = await prisma.labelGroup.findFirst({
      where: {
        id: labelGroup.id,
      },
    });
    expect(typeof response?.id).toBe("string");
  });

  describe("error", () => {
    it("fails to create a label group with not existing label", async () => {
      await prisma.labelGroup.create({
        data: {
          userId: user.id,
          title: "hotdog",
          warnWhenNotPresent: true,
        },
      });
      return expect(async () => {
        await trpc.labelGroups.createLabelGroup.mutate({
          title: "hotdog",
          labelIds: ["00008495-d189-4a99-98bb-8888442de945"],
          warnWhenNotPresent: true,
        });
      }).rejects.toThrow("Conflicting labelGroup title");
    });
  });
});
