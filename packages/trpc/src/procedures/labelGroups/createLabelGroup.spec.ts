import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("createLabelGroup", () => {
  describe("success", () => {
    test("creates a label group with a single label attached", async ({
      trpc,
      user,
    }) => {
      const label = await prisma.label.create({
        data: {
          userId: user.id,
          title: "burger",
        },
      });

      const response = await trpc.labelGroups.createLabelGroup({
        title: "soup",
        labelIds: [label.id],
        warnWhenNotPresent: true,
      });
      expect(response.title).toEqual("soup");

      const labelGroup = await prisma.labelGroup.findUnique({
        where: { id: response.id },
        include: { labels: true },
      });
      expect(labelGroup?.userId).toEqual(user.id);
      expect(labelGroup?.labels.map((l) => l.id)).toEqual([label.id]);
    });

    test("creates a label group with multiple labels attached", async ({
      trpc,
      user,
    }) => {
      const meatLabel = await prisma.label.create({
        data: {
          userId: user.id,
          title: "meat",
        },
      });
      const fishLabel = await prisma.label.create({
        data: {
          userId: user.id,
          title: "fish",
        },
      });

      const response = await trpc.labelGroups.createLabelGroup({
        title: "pizza",
        labelIds: [meatLabel.id, fishLabel.id],
        warnWhenNotPresent: true,
      });
      expect(response.title).toEqual("pizza");

      const labelGroup = await prisma.labelGroup.findUnique({
        where: { id: response.id },
        include: { labels: true },
      });
      expect(labelGroup?.labels.map((l) => l.id).sort()).toEqual(
        [meatLabel.id, fishLabel.id].sort(),
      );
    });
  });

  describe("error", () => {
    test("throws when the title is already taken", async ({ trpc, user }) => {
      await prisma.labelGroup.create({
        data: {
          userId: user.id,
          title: "hotdog",
          warnWhenNotPresent: true,
        },
      });

      await expect(
        trpc.labelGroups.createLabelGroup({
          title: "hotdog",
          labelIds: [],
          warnWhenNotPresent: true,
        }),
      ).rejects.toThrow("Conflicting labelGroup title");
    });
  });
});
