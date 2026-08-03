import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("updateLabel", () => {
  describe("success", () => {
    test("updates the label", async ({ trpc, user }) => {
      const label = await prisma.label.create({
        data: {
          userId: user.id,
          title: "meat",
        },
      });

      await trpc.labels.updateLabel({
        id: label.id,
        title: "fish",
        labelGroupId: null,
      });

      const updatedLabel = await prisma.label.findUnique({
        where: { id: label.id },
      });
      expect(updatedLabel?.title).toEqual("fish");
    });

    test("assigns the label to a group without a title", async ({
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
          title: "protein",
          warnWhenNotPresent: false,
        },
      });

      await trpc.labels.updateLabel({
        id: label.id,
        labelGroupId: labelGroup.id,
      });

      const updatedLabel = await prisma.label.findUnique({
        where: { id: label.id },
      });
      expect(updatedLabel?.labelGroupId).toEqual(labelGroup.id);
      expect(updatedLabel?.title).toEqual("meat");
    });

    test("allows updating a label to the title it already has", async ({
      trpc,
      user,
    }) => {
      const label = await prisma.label.create({
        data: {
          userId: user.id,
          title: "meat",
        },
      });

      await trpc.labels.updateLabel({
        id: label.id,
        title: "meat",
        labelGroupId: null,
      });

      const updatedLabel = await prisma.label.findUnique({
        where: { id: label.id },
      });
      expect(updatedLabel?.title).toEqual("meat");
    });
  });

  describe("error", () => {
    test("throws when another label already has the new title", async ({
      trpc,
      user,
    }) => {
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

      await expect(
        trpc.labels.updateLabel({
          id: label.id,
          title: "fish",
          labelGroupId: null,
        }),
      ).rejects.toThrow("Conflicting label title");
    });
  });
});
