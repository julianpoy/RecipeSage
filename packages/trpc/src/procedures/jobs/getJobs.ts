import { prisma, prismaJobSummaryToJobSummary } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { jobSummary } from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";

export const getJobs = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  validateTrpcSession(session);

  const jobs = await prisma.job.findMany({
    where: {
      userId: session.userId,
    },
    ...jobSummary,
  });

  return jobs.map((job) => prismaJobSummaryToJobSummary(job));
});
