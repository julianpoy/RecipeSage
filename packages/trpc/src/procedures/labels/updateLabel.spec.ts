import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("updateslabel", () => {
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
    it("updates label", async () => {
      const label = await prisma.label.create({
        data: {
          userId: user.id,
          title: "meat",
        },
      });

      await trpc.labels.updateLabel.mutate({
        id: label.id,
        title: "fish",
        labelGroupId: null,
      });

      const updatedLabel = await prisma.label.findUnique({
        where: {
          id: label.id,
        },
      });
      expect(updatedLabel?.title).toEqual("fish");
    });
  });

  describe("error", () => {
    it("throws on conflicting label title", async () => {
      return expect(async () => {
        const label = await prisma.label.create({
          data: {
            userId: user.id,
            title: "meat",
          },
        });
        await prisma.label.create({
          data: {
            userId: user.id,
            title: "fish",
          },
        });
        await trpc.labels.updateLabel.mutate({
          id: label.id,
          title: "fish",
          labelGroupId: null,
        });
      }).rejects.toThrow("Conflicting label title");
    });
  });
});
