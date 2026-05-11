import { prisma } from "@recipesage/prisma";
import { test } from "../../testutils";

describe("createLabel", () => {
  describe("success", () => {
    test("creates a label", async ({ trpc, user }) => {
      const response = await trpc.labels.createLabel({
        title: "diners",
        labelGroupId: null,
      });

      const label = await prisma.label.findUnique({
        where: { id: response.id },
      });
      expect(label?.title).toEqual("diners");
      expect(label?.userId).toEqual(user.id);
    });
  });
});
