import { prisma } from "@recipesage/prisma";
import { FREE_DAILY_CREDITS } from "@recipesage/util/server/general";
import { test, anonymousTrpc } from "../../testutils";

describe("getMyCreditUsage", () => {
  describe("success", () => {
    test("returns zero usage for a fresh user", async ({ trpc }) => {
      const response = await trpc.users.getMyCreditUsage();

      expect(response.used).toEqual(0);
      expect(response.limit).toEqual(FREE_DAILY_CREDITS);
      expect(response.resetsAt.getTime()).toBeGreaterThan(Date.now());
      expect(response.resetsAt.getTime()).toBeLessThan(
        Date.now() + 25 * 60 * 60 * 1000,
      );
    });

    test("sums credit usage logged today", async ({ trpc, user }) => {
      await prisma.userCreditLog.create({
        data: { userId: user.id, operation: "mlOcr", credits: 2 },
      });
      await prisma.userCreditLog.create({
        data: { userId: user.id, operation: "clipHtml", credits: 1 },
      });

      const response = await trpc.users.getMyCreditUsage();
      expect(response.used).toEqual(3);
    });

    test("ignores usage logged before today", async ({ trpc, user }) => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      await prisma.userCreditLog.create({
        data: {
          userId: user.id,
          operation: "mlOcr",
          credits: 5,
          createdAt: yesterday,
        },
      });

      const response = await trpc.users.getMyCreditUsage();
      expect(response.used).toEqual(0);
    });

    test("ignores another user's usage", async ({ trpc, user2 }) => {
      await prisma.userCreditLog.create({
        data: { userId: user2.id, operation: "mlOcr", credits: 5 },
      });

      const response = await trpc.users.getMyCreditUsage();
      expect(response.used).toEqual(0);
    });
  });

  describe("error", () => {
    test("throws when the caller is not logged in", async () => {
      await expect(anonymousTrpc.users.getMyCreditUsage()).rejects.toThrow(
        "Must be logged in",
      );
    });
  });
});
