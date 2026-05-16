import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("getLabels", () => {
  describe("success", () => {
    test("returns the calling user's labels", async ({ trpc, user }) => {
      await prisma.label.create({
        data: {
          userId: user.id,
          title: "meat",
        },
      });

      const response = await trpc.labels.getLabels();
      expect(response[0].title).toEqual("meat");
    });

    test("does not return labels owned by another user", async ({
      trpc,
      user2,
    }) => {
      await prisma.label.create({
        data: {
          userId: user2.id,
          title: "meat",
        },
      });

      const response = await trpc.labels.getLabels();
      expect(response.length).toEqual(0);
    });
  });
});
