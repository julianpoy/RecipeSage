import type { SandboxedJob } from "bullmq";
import type { JobQueueItem } from "./JobQueueItem";
import * as Sentry from "@sentry/node";
import {
  jobSummary,
  prisma,
  prismaJobSummaryToJobSummary,
} from "@recipesage/prisma";
import { JobStatus, JobType } from "@recipesage/prisma";
import { processImportJob } from "./import/processImportJob";
import { processExportJob } from "./export/processExportJob";
import { processCookbookJob } from "./cookbook/processCookbookJob";
import {
  jobErrorsToReport,
  jobErrorToResultCode,
} from "../jobs/getJobResultCode";
import { onJobUpdate } from "../jobs/updateJobProgress";
import { moderateDiscoverRecipe } from "../../ml/moderateDiscoverRecipe";

export const processWorkerJob = async (
  args: SandboxedJob<JobQueueItem, unknown>,
) => {
  if ("discoverModeration" in args.data) {
    const { discoverRecipeId } = args.data.discoverModeration;
    try {
      await moderateDiscoverRecipe(discoverRecipeId);
    } catch (e) {
      Sentry.captureException(e, {
        extra: {
          discoverRecipeId,
        },
      });
      console.error(e);
      throw e;
    }
    return;
  }

  if (!args.data.jobId) {
    throw new Error("Job queue item is missing a jobId");
  }
  const jobId = args.data.jobId;

  const verify = await prisma.job.findUniqueOrThrow({
    where: {
      id: jobId,
    },
    ...jobSummary,
  });
  if (
    verify.status !== JobStatus.CREATE &&
    !process.env.JOB_QUEUE_ALLOW_REPROCESS
  ) {
    throw new Error(
      "Attempted to start processing on job that is not in CREATE state",
    );
  }

  const _job = await prisma.job.update({
    where: {
      id: jobId,
      status: JobStatus.CREATE,
    },
    data: {
      status: JobStatus.RUN,
    },
    ...jobSummary,
  });
  const job = prismaJobSummaryToJobSummary(_job);

  const subType =
    job.type === JobType.IMPORT
      ? job.meta.importType
      : job.type === JobType.EXPORT
        ? job.meta.exportType
        : undefined;
  console.log(`Starting processing job ${args.id} with ${job.type}.${subType}`);
  await onJobUpdate({
    jobId: job.id,
    userId: job.userId,
  });

  try {
    switch (job.type) {
      case JobType.IMPORT: {
        await processImportJob(job, args.data);
        break;
      }
      case JobType.EXPORT: {
        await processExportJob(job, args.data);
        break;
      }
      case JobType.COOKBOOK: {
        await processCookbookJob(job, args.data);
        break;
      }
    }
  } catch (e) {
    const resultCode = jobErrorToResultCode(e);
    if (jobErrorsToReport.includes(resultCode)) {
      Sentry.captureException(e, {
        extra: {
          jobId: job.id,
        },
      });
      console.error(e);
    }

    await prisma.job.update({
      where: {
        id: job.id,
      },
      data: {
        status: JobStatus.FAIL,
        resultCode,
      },
    });
  }

  await onJobUpdate({
    jobId: job.id,
    userId: job.userId,
  });

  console.log(`Finished processing job ${args.id}`);
};
