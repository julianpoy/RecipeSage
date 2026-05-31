import {
  JobStatus,
  JobType,
  prisma,
  type ExportJobMeta,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { enqueueJob } from "@recipesage/util/server/general";
import { z } from "zod";

export const startExportJob = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/jobs/startExportJob",
      tags: ["jobs"],
      summary: "Start an export job",
      protect: true,
    },
  })
  .input(
    z.object({
      format: z.union([
        z.literal("txt"),
        z.literal("pdf"),
        z.literal("jsonld"),
      ]),
      recipeIds: z.array(z.uuid()).min(1).max(5000).optional(),
    }),
  )
  .output(
    z.object({
      jobId: z.uuid(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const job = await prisma.job.create({
      data: {
        userId: ctx.session.userId,
        type: JobType.EXPORT,
        status: JobStatus.CREATE,
        progress: 1,
        meta: {
          exportType: input.format,
          exportScope: input.recipeIds ? "recipeids" : "all",
          recipeIds: input.recipeIds,
          language: ctx.language,
        } satisfies ExportJobMeta,
      },
    });

    await enqueueJob({
      jobId: job.id,
    });

    return {
      jobId: job.id,
    };
  });
