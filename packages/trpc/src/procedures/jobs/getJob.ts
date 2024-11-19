import { prisma, prismaJobSummaryToJobSummary } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { jobSummary } from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getJob = publicProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    }),
  )
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
