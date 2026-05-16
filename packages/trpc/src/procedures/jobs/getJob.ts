import {
  jobSummary,
  jobSummarySchema,
  prisma,
  prismaJobSummaryToJobSummary,
} from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getJob = publicProcedure
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
    const session = ctx.session;
    validateTrpcSession(session);

    const job = await prisma.job.findUniqueOrThrow({
      where: {
        userId: session.userId,
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
