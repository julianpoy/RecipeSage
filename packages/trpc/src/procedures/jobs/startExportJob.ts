import Sentry from "@sentry/node";
import { JobMeta, prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import {
  exportDataAsync,
  metrics,
  throttleDropPromise,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { z } from "zod";
import { JobStatus, JobType } from "@prisma/client";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";

/**
 * How often to write the job percentage completion to the database
 */
const JOB_PROGRESS_UPDATE_PERIOD_SECONDS = 3;

export const startExportJob = publicProcedure
  .input(
    z.object({
      format: z.union([
        z.literal("txt"),
        z.literal("pdf"),
        z.literal("jsonld"),
      ]),
      recipeIds: z.array(z.string()).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const timer = metrics.jobFinished.startTimer();

    const job = await prisma.job.create({
      data: {
        userId: session.userId,
        type: JobType.EXPORT,
        status: JobStatus.RUN,
        progress: 1,
        meta: {
          exportType: input.format,
          exportScope: input.recipeIds ? "recipeids" : "all",
        } satisfies JobMeta,
      },
    });

    const onProgress = throttleDropPromise(
      async (processed: number, totalCount: number) => {
        try {
          await prisma.job.updateMany({
            where: {
              id: job.id,
              status: JobStatus.RUN,
            },
            data: {
              progress: Math.max(Math.floor((processed / totalCount) * 100), 1),
            },
          });
        } catch (e) {
          Sentry.captureException(e);
          console.error(e);
        }
      },
      JOB_PROGRESS_UPDATE_PERIOD_SECONDS * 1000,
    );

    exportDataAsync({
      format: input.format,
      where: {
        userId: session.userId,
        id: input.recipeIds
          ? {
              in: input.recipeIds,
            }
          : undefined,
      },
      onProgress,
    })
      .then(async (s3Record) => {
        await prisma.job.update({
          where: {
            id: job.id,
          },
          data: {
            status: JobStatus.SUCCESS,
            progress: 100,
            meta: {
              ...(job.meta as JobMeta),
              exportDownloadUrl: s3Record.location,
            } satisfies JobMeta,
          },
        });

        metrics.jobFinished.observe(
          {
            job_type: "export",
          },
          timer(),
        );
      })
      .catch(async (e) => {
        await prisma.job.update({
          where: {
            id: job.id,
          },
          data: {
            status: JobStatus.FAIL,
            resultCode: JOB_RESULT_CODES.unknown,
          },
        });

        metrics.jobFailed.observe(
          {
            job_type: "export",
          },
          timer(),
        );

        Sentry.captureException(e, {
          extra: {
            jobId: job.id,
          },
        });
        console.error(e);
      });

    metrics.jobStarted.inc();

    return {
      jobId: job.id,
    };
  });
