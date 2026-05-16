import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("getLabelsByUserId", () => {
  describe("success", () => {
    test("returns the labels owned by the given user", async ({
      trpc,
      user,
    }) => {
      const label = await prisma.label.create({
        data: {
          userId: user.id,
          title: "meat",
        },
      });

      const response = await trpc.labels.getLabelsByUserId({
        userIds: [user.id],
      });
      expect(response[0].id).toEqual(label.id);
    });
  });

  describe("error", () => {
    test("does not return another user's labels", async ({
      trpc2,
      user,
      user2,
    }) => {
      await prisma.label.create({
        data: {
          userId: user.id,
          title: "fish",
        },
      });

      const response = await trpc2.labels.getLabelsByUserId({
        userIds: [user2.id],
      });
      expect(response.length).toEqual(0);
    });
  });
});
