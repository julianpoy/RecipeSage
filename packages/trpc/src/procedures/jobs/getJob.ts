import {
  jobSummary,
  jobSummarySchema,
  prisma,
  prismaJobSummaryToJobSummary,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getJob = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/jobs/getJob",
      tags: ["jobs"],
      summary: "Get a single job by id",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(jobSummarySchema)
  .query(async ({ input, ctx }) => {
    const job = await prisma.job.findUniqueOrThrow({
      where: {
        userId: ctx.session.userId,
        id: input.id,
      },
      ...jobSummary,
    });

    if (!job) {
      throw new TRPCError({
        code: "NOT_FOUND",
      });
    }

    return prismaJobSummaryToJobSummary(job);
  });
