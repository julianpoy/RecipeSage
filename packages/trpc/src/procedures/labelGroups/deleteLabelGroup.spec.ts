import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("deleteLabelGroup", () => {
  describe("success", () => {
    test("deletes a label group", async ({ trpc, user }) => {
      const labelGroup = await prisma.labelGroup.create({
        data: {
          title: "soup",
          userId: user.id,
          warnWhenNotPresent: true,
        },
      });

      await trpc.labelGroups.deleteLabelGroup({
        id: labelGroup.id,
      });

      const deletedLabelGroup = await prisma.labelGroup.findUnique({
        where: { id: labelGroup.id },
      });
      expect(deletedLabelGroup).toEqual(null);
    });
  });

  describe("error", () => {
    test("throws when the label group does not exist", async ({ trpc }) => {
      await expect(
        trpc.labelGroups.deleteLabelGroup({
          id: "00000ca5-50e7-4144-bc11-e82925837a14",
        }),
      ).rejects.toThrow("Label group not found");
    });
  });
});
