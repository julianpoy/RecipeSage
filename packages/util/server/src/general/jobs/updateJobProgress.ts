import { prisma, JobStatus } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import { broadcastWSEventIgnoringErrors, WSBroadcastEventType } from "../grip";
import { throttleDropPromise } from "../throttleDropPromise";

export const convertJobProgress = (args: {
  progress: number; // 0-1
  step: number;
  totalStepCount: number;
}) => {
  const stepProgress = 100 * args.progress;
  const completedSoFar = 100 * ((args.step - 1) / args.totalStepCount);
  const convertedProgress = stepProgress / args.totalStepCount + completedSoFar;

  return convertedProgress;
};

export const updateJobProgress = async (args: {
  jobId: string;
  userId: string;
  progress: number;
}) => {
  const { count } = await prisma.job.updateMany({
    where: {
      id: args.jobId,
      status: JobStatus.RUN,
      progress: {
        lt: args.progress,
      },
    },
    data: {
      progress: args.progress,
    },
  });

  if (!count) return;

  await onJobUpdate({
    jobId: args.jobId,
    userId: args.userId,
  });
};

export const onJobUpdate = (args: { jobId: string; userId: string }) => {
  return broadcastWSEventIgnoringErrors(
    args.userId,
    WSBroadcastEventType.JobUpdated,
    {
      jobId: args.jobId,
    },
  );
};

const JOB_PROGRESS_UPDATE_PERIOD_SECONDS = 3;

export const debounceJobUpdateProgress = (constructArgs: {
  jobId: string;
  userId: string;
}) => {
  return throttleDropPromise(
    async (onProgressArgs: {
      processedCount: number;
      totalCount: number;
      step: number;
      totalStepCount: number;
    }) => {
      try {
        await updateJobProgress({
          jobId: constructArgs.jobId,
          userId: constructArgs.userId,
          progress: convertJobProgress({
            progress: onProgressArgs.processedCount / onProgressArgs.totalCount,
            step: onProgressArgs.step,
            totalStepCount: onProgressArgs.totalStepCount,
          }),
        });
      } catch (e) {
        Sentry.captureException(e);
        console.error(e);
      }
    },
    JOB_PROGRESS_UPDATE_PERIOD_SECONDS * 1000,
  );
};
