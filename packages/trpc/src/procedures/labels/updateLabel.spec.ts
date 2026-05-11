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
