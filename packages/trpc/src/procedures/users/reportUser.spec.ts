import { prisma, UserReportStatus } from "@recipesage/prisma";
import { test, anonymousTrpc } from "../../testutils";

describe("reportUser", () => {
  describe("success", () => {
    test("creates an open report with the trimmed reason", async ({
      trpc,
      user,
      user2,
    }) => {
      await expect(
        trpc.users.reportUser({
          userId: user2.id,
          reason: "  Sent me abusive messages  ",
        }),
      ).resolves.toEqual({ reported: true });

      const userReport = await prisma.userReport.findFirst({
        where: { reporterUserId: user.id, reportedUserId: user2.id },
      });
      expect(userReport?.reason).toEqual("Sent me abusive messages");
      expect(userReport?.status).toEqual(UserReportStatus.OPEN);
    });

    test("reopens and updates an existing report from the same reporter", async ({
      trpc,
      user,
      user2,
    }) => {
      await prisma.userReport.create({
        data: {
          reporterUserId: user.id,
          reportedUserId: user2.id,
          reason: "First reason",
          status: UserReportStatus.DISMISSED,
        },
      });

      await trpc.users.reportUser({
        userId: user2.id,
        reason: "Second reason",
      });

      const userReports = await prisma.userReport.findMany({
        where: { reporterUserId: user.id, reportedUserId: user2.id },
      });
      expect(userReports).toHaveLength(1);
      expect(userReports[0].reason).toEqual("Second reason");
      expect(userReports[0].status).toEqual(UserReportStatus.OPEN);
    });
  });

  describe("error", () => {
    test("rejects reporting yourself", async ({ trpc, user }) => {
      await expect(
        trpc.users.reportUser({ userId: user.id, reason: "Some reason" }),
      ).rejects.toThrow("You can't report yourself");
    });

    test("rejects a reason that is too short", async ({ trpc, user2 }) => {
      await expect(
        trpc.users.reportUser({ userId: user2.id, reason: "bad" }),
      ).rejects.toThrow();
    });

    test("throws when the reported user does not exist", async ({ trpc }) => {
      await expect(
        trpc.users.reportUser({
          userId: "00000000-0000-0000-0000-000000000000",
          reason: "Some reason",
        }),
      ).rejects.toThrow("No user found with that id");
    });

    test("throws when the caller is not logged in", async ({ user2 }) => {
      await expect(
        anonymousTrpc.users.reportUser({
          userId: user2.id,
          reason: "Some reason",
        }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
