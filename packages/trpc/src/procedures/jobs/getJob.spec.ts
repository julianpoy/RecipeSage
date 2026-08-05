import { prisma } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { test, anonymousTrpc } from "../../testutils";

describe("getJob", () => {
  describe("success", () => {
    test("returns the caller's job", async ({ trpc, user }) => {
      const job = await prisma.job.create({
        data: {
          userId: user.id,
          type: "EXPORT",
          status: "RUN",
          progress: 10,
        },
      });

      const response = await trpc.jobs.getJob({ id: job.id });

      expect(response.id).toEqual(job.id);
      expect(response.status).toEqual("RUN");
    });
  });

  describe("error", () => {
    test("throws not found for an unknown job id", async ({ trpc }) => {
      await expect(
        trpc.jobs.getJob({ id: faker.string.uuid() }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    test("throws not found for another user's job", async ({ trpc, user2 }) => {
      const job = await prisma.job.create({
        data: {
          userId: user2.id,
          type: "EXPORT",
          status: "RUN",
          progress: 10,
        },
      });

      await expect(trpc.jobs.getJob({ id: job.id })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    test("throws when the caller is not logged in", async () => {
      await expect(
        anonymousTrpc.jobs.getJob({ id: faker.string.uuid() }),
      ).rejects.toThrow("Must be logged in");
    });
  });
});
