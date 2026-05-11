import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("updateLabelGroup", () => {
  describe("success", () => {
    test("updates the label group's title and attached labels", async ({
      trpc,
      user,
    }) => {
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

      const response = await trpc.labelGroups.updateLabelGroup({
        id: labelGroup.id,
        title: "fish",
        labelIds: [label.id],
        warnWhenNotPresent: true,
      });
      expect(response.title).toEqual("fish");

      const updatedLabelGroup = await prisma.labelGroup.findUnique({
        where: { id: labelGroup.id },
      });
      expect(updatedLabelGroup?.title).toEqual("fish");

      const updatedLabel = await prisma.label.findUnique({
        where: { id: label.id },
      });
      expect(updatedLabel?.labelGroupId).toEqual(labelGroup.id);
    });
  });

  describe("error", () => {
    test("throws when another label group already has the new title", async ({
      trpc,
      user,
    }) => {
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
          title: "veggie",
          warnWhenNotPresent: true,
        },
      });

      await expect(
        trpc.labelGroups.updateLabelGroup({
          id: labelGroup.id,
          title: "veggie",
          labelIds: [],
          warnWhenNotPresent: true,
        }),
      ).rejects.toThrow("Conflicting labelGroup title");
    });
  });
});
