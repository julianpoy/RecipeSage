import {
  jobSummary,
  jobSummarySchema,
  prisma,
  prismaJobSummaryToJobSummary,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const getJobs = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/jobs/getJobs",
      tags: ["jobs"],
      summary: "Get all of the caller's jobs",
      protect: true,
    },
  })
  .output(z.array(jobSummarySchema))
  .query(async ({ ctx }) => {
    const jobs = await prisma.job.findMany({
      where: {
        userId: ctx.session.userId,
      },
      take: 200,
      ...jobSummary,
    });

    return jobs.map((job) => prismaJobSummaryToJobSummary(job));
  });
