import {
  JobStatus,
  JobType,
  prisma,
  type CookbookJobMeta,
} from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import {
  enqueueJob,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { z } from "zod";

export const startCookbookJob = publicProcedure
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
      recipeIds: z.array(z.uuid()).min(1).max(1000),
      language: z.string().max(35).optional(),
    }),
  )
  .output(
    z.object({
      jobId: z.uuid(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const job = await prisma.job.create({
      data: {
        userId: session.userId,
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
          recipeIds: input.recipeIds,
          language: input.language,
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
