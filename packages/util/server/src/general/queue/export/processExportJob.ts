import type {
  ExportJobMeta,
  JobSummary,
  Prisma,
  RecipeSummary,
} from "@recipesage/prisma";
import type { JobQueueItem } from "../JobQueueItem";
import * as Sentry from "@sentry/node";
import {
  JobStatus,
  JobType,
  prisma,
  prismaCursorStream,
  recipeSummary,
} from "@recipesage/prisma";
import { txtExportJobHandler } from "./handlers/txtExportJobHandler";
import { pdfExportJobHandler } from "./handlers/pdfExportJobHandler";
import { jsonldExportJobHandler } from "./handlers/jsonldExportJobHandler";
import { throttleDropPromise } from "../../throttleDropPromise";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import {
  convertJobProgress,
  updateJobProgress,
} from "../../jobs/updateJobProgress";

const EXPORT_JOB_STEP_COUNT = 1;

/**
 * How often to write the job percentage completion to the database
 */
const JOB_PROGRESS_UPDATE_PERIOD_SECONDS = 3;

export const processExportJob = async (
  job: JobSummary,
  _jobQueueItem: JobQueueItem,
) => {
  if (job.type !== JobType.EXPORT) {
    throw new Error("Export processor received a non-export job");
  }

  const jobMeta = job.meta;

  const whereClause: Prisma.RecipeWhereInput = {
    userId: job.userId,
    id: jobMeta.recipeIds
      ? {
          in: jobMeta.recipeIds,
        }
      : undefined,
  };

  const totalCount = await prisma.recipe.count({
    where: whereClause,
  });

  const recipes = prismaCursorStream.recipe.cursorStream(
    {
      where: whereClause,
      ...recipeSummary,
      orderBy: {
        title: "asc",
      },
    },
    {
      batchSize: 100,
      prefill: 100,
    },
  ) as unknown as AsyncIterable<RecipeSummary>;

  const onProgress = throttleDropPromise(async (processedCount: number) => {
    try {
      await updateJobProgress({
        jobId: job.id,
        userId: job.userId,
        progress: convertJobProgress({
          progress: processedCount / totalCount,
          step: 1,
          totalStepCount: EXPORT_JOB_STEP_COUNT,
        }),
      });
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
    }
  }, JOB_PROGRESS_UPDATE_PERIOD_SECONDS * 1000);

  const storageRecord = await (async () => {
    switch (jobMeta.exportType) {
      case "txt":
        return txtExportJobHandler(job, recipes, onProgress);
      case "pdf":
        return pdfExportJobHandler(job, recipes, onProgress);
      case "jsonld":
        return jsonldExportJobHandler(job, recipes, onProgress);
      default:
        throw new Error(`Unsupported export type: ${jobMeta.exportType}`);
    }
  })();

  await prisma.job.update({
    where: {
      id: job.id,
    },
    data: {
      status: JobStatus.SUCCESS,
      resultCode: JOB_RESULT_CODES.success,
      progress: 100,
      meta: {
        ...jobMeta,
        exportStorageBucket: storageRecord.bucket,
        exportStorageKey: storageRecord.key,
        exportDownloadUrl: storageRecord.location,
      } satisfies ExportJobMeta,
    },
  });
};
