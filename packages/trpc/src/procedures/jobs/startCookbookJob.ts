import {
  JobStatus,
  JobType,
  prisma,
  type CookbookJobMeta,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { enqueueJob } from "@recipesage/util/server/general";
import { z } from "zod";

export const startCookbookJob = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/jobs/startCookbookJob",
      tags: ["jobs"],
      summary: "Start a cookbook PDF generation job",
      protect: true,
    },
  })
  .input(
    z.object({
      title: z.string().trim().min(1).max(1000),
      subtitle: z.string().trim().max(1000).optional(),
      introduction: z.string().trim().max(50000).optional(),
      author: z.string().trim().max(1000).optional(),
      includeToc: z.boolean(),
      includeImages: z.boolean(),
      includeLabels: z.boolean(),
      recipeIds: z.array(z.uuid()).min(1).max(1000),
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
        type: JobType.COOKBOOK,
        status: JobStatus.CREATE,
        progress: 1,
        meta: {
          cookbookTitle: input.title,
          cookbookSubtitle: input.subtitle,
          cookbookIntroduction: input.introduction,
          cookbookAuthor: input.author,
          cookbookIncludeToc: input.includeToc,
          cookbookIncludeImages: input.includeImages,
          cookbookIncludeLabels: input.includeLabels,
          recipeIds: input.recipeIds,
          language: ctx.language,
        } satisfies CookbookJobMeta,
      },
    });

    await enqueueJob({
      jobId: job.id,
    });

    return {
      jobId: job.id,
    };
  });
