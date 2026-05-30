import {
  jobSummary,
  jobSummarySchema,
  prisma,
  prismaJobSummaryToJobSummary,
} from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";

export const getJobs = publicProcedure
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
    const session = ctx.session;
    validateTrpcSession(session);

    const jobs = await prisma.job.findMany({
      where: {
        userId: session.userId,
      },
      take: 200,
      ...jobSummary,
    });

    return jobs.map((job) => prismaJobSummaryToJobSummary(job));
  });
