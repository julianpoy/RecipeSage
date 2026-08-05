import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma, User, Prisma } from "@recipesage/prisma";
import { userFactory } from "../general/factories";

const getJobsMock = vi.fn(async () => [] as { data: { jobId: string } }[]);

vi.mock("../general/queue", () => ({
  getJobQueue: () => ({
    getJobs: (...args: unknown[]) => getJobsMock(...(args as [])),
  }),
}));

const { invalidateStaleJobs } = await import("./invalidateStaleJobs");

const backdate = async (jobId: string, hours = 2) => {
  await prisma.$executeRaw(
    Prisma.sql`UPDATE "Job" SET "updatedAt" = NOW() - ${hours} * INTERVAL '1 hour' WHERE id = ${jobId}::uuid`,
  );
};

describe("invalidateStaleJobs", () => {
  let user: User;

  beforeEach(async () => {
    getJobsMock.mockReset();
    getJobsMock.mockResolvedValue([]);
    user = await prisma.user.create({ data: userFactory() });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  it("fails a job left running past the stale window", async () => {
    const job = await prisma.job.create({
      data: { userId: user.id, type: "IMPORT", status: "RUN", progress: 5 },
    });
    await backdate(job.id);

    await invalidateStaleJobs();

    const updated = await prisma.job.findUniqueOrThrow({
      where: { id: job.id },
    });
    expect(updated.status).toEqual("FAIL");
  });

  it("fails a created job that is no longer in the queue", async () => {
    const job = await prisma.job.create({
      data: { userId: user.id, type: "IMPORT", status: "CREATE", progress: 0 },
    });
    await backdate(job.id);

    await invalidateStaleJobs();

    const updated = await prisma.job.findUniqueOrThrow({
      where: { id: job.id },
    });
    expect(updated.status).toEqual("FAIL");
  });

  it("leaves a created job alone while it is still waiting in the queue", async () => {
    const job = await prisma.job.create({
      data: { userId: user.id, type: "IMPORT", status: "CREATE", progress: 0 },
    });
    await backdate(job.id);
    getJobsMock.mockResolvedValue([{ data: { jobId: job.id } }]);

    await invalidateStaleJobs();

    const updated = await prisma.job.findUniqueOrThrow({
      where: { id: job.id },
    });
    expect(updated.status).toEqual("CREATE");
  });

  it("leaves a created job alone when the queue cannot be reached", async () => {
    const job = await prisma.job.create({
      data: { userId: user.id, type: "IMPORT", status: "CREATE", progress: 0 },
    });
    await backdate(job.id);
    getJobsMock.mockRejectedValue(new Error("Queue unreachable"));

    await invalidateStaleJobs();

    const updated = await prisma.job.findUniqueOrThrow({
      where: { id: job.id },
    });
    expect(updated.status).toEqual("CREATE");
  });

  it("fails a created job that outlasts the grace period while the queue cannot be reached", async () => {
    const job = await prisma.job.create({
      data: { userId: user.id, type: "IMPORT", status: "CREATE", progress: 0 },
    });
    await backdate(job.id, 4);
    getJobsMock.mockRejectedValue(new Error("Queue unreachable"));

    await invalidateStaleJobs();

    const updated = await prisma.job.findUniqueOrThrow({
      where: { id: job.id },
    });
    expect(updated.status).toEqual("FAIL");
  });

  it("leaves a recently updated job alone", async () => {
    const job = await prisma.job.create({
      data: { userId: user.id, type: "IMPORT", status: "RUN", progress: 5 },
    });

    await invalidateStaleJobs();

    const updated = await prisma.job.findUniqueOrThrow({
      where: { id: job.id },
    });
    expect(updated.status).toEqual("RUN");
  });
});
