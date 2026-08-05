import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test, anonymousTrpc } from "../../testutils";

describe("getJobDownloadUrlById", () => {
  describe("error", () => {
    test("throws not found for an unknown job id", async ({ trpc }) => {
      await expect(
        trpc.jobs.getJobDownloadUrlById({ id: faker.string.uuid() }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    test("throws not found for another user's job", async ({ trpc, user2 }) => {
      const job = await prisma.job.create({
        data: {
          userId: user2.id,
          type: "EXPORT",
          status: "SUCCESS",
          progress: 100,
          meta: { exportStorageKey: "key", exportType: "txt" },
        },
      });

      await expect(
        trpc.jobs.getJobDownloadUrlById({ id: job.id }),
      ).rejects.toThrow();
    });

    test("throws not found for an import job", async ({ trpc, user }) => {
      const job = await prisma.job.create({
        data: {
          userId: user.id,
          type: "IMPORT",
          status: "SUCCESS",
          progress: 100,
        },
      });

      await expect(
        trpc.jobs.getJobDownloadUrlById({ id: job.id }),
      ).rejects.toThrow();
    });

    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.jobs.getJobDownloadUrlById({ id: faker.string.uuid() }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
