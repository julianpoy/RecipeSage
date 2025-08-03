import { trpcSetup, tearDown } from "../../testutils";
import { prisma } from "@recipesage/prisma";
import { User } from "@prisma/client";
import type { TRPCClient } from "@trpc/client";
import type { AppRouter } from "../../index";

describe("createLabel", () => {
  let user: User;
  let user2: User;
  let trpc: TRPCClient<AppRouter>;

  beforeAll(async () => {
    ({ user, user2, trpc } = await trpcSetup());
  });

  afterAll(() => {
    return tearDown(user.id, user2.id);
  });

  describe("success", () => {
    it("creates a label with all parameters provided", async () => {
      const label = await trpc.labels.createLabel.mutate({
        title: "diners",
        labelGroupId: null,
      });
      expect(typeof label.id).toBe("string");
      const response = await prisma.label.findFirst({
        where: {
          id: label.id,
        },
      });
      expect(typeof response?.id).toBe("string");

      const updatedLabel = await prisma.label.findUnique({
        where: {
          id: label.id,
        },
      });
      expect(updatedLabel?.title).toEqual("diners");
    });
  });
});
