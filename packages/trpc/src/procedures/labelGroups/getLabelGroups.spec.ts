import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("getLabelGroups", () => {
  describe("success", () => {
    test("returns the calling user's label groups", async ({ trpc, user }) => {
      await prisma.labelGroup.create({
        data: {
          title: "meat",
          userId: user.id,
          warnWhenNotPresent: true,
        },
      });

      const response = await trpc.labelGroups.getLabelGroups();
      expect(response[0].title).toEqual("meat");
    });

    test("returns an empty list when the user has no label groups", async ({
      trpc,
    }) => {
      const response = await trpc.labelGroups.getLabelGroups();
      expect(response.length).toEqual(0);
    });
  });
});
