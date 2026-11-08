import { Worker } from "bullmq";
import * as Sentry from "@sentry/node";
import type { ImageDeletionJobQueueItem } from "./ImageDeletionJobQueueItem";
import { processImageDeletionJob } from "./processImageDeletionJob";
import { IMAGE_DELETION_QUEUE_NAME } from "./getImageDeletionQueue";
import { getQueueRedisOptions } from "../getQueueRedisOptions";

const IMAGE_DELETION_RATE_LIMIT_MAX_JOBS = 1;
const IMAGE_DELETION_RATE_LIMIT_DURATION_MS = 1000;

let imageDeletionQueueWorker:
  Worker<ImageDeletionJobQueueItem, void> | undefined;
export const getImageDeletionQueueWorker = () => {
  if (imageDeletionQueueWorker) return imageDeletionQueueWorker;

  imageDeletionQueueWorker = new Worker<ImageDeletionJobQueueItem, void>(
    IMAGE_DELETION_QUEUE_NAME,
    (job) => processImageDeletionJob(job.data),
    {
      autorun: false,
      ...getQueueRedisOptions(),
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 1000 },
      concurrency: 1,
      limiter: {
        max: IMAGE_DELETION_RATE_LIMIT_MAX_JOBS,
        duration: IMAGE_DELETION_RATE_LIMIT_DURATION_MS,
      },
    },
  );

  imageDeletionQueueWorker.on("error", (err) => {
    Sentry.captureException(err);
    console.error(err);
  });

  imageDeletionQueueWorker.on("failed", (job, error) => {
    console.error(`Image deletion job ${job?.id} failed`, error);

    if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;

    Sentry.captureException(error, {
      extra: {
        queueJobId: job.id,
        attemptsMade: job.attemptsMade,
        imageCount: job.data.imageIds.length,
        imageOwnerUserId: job.data.imageOwnerUserId,
      },
    });
  });

  return imageDeletionQueueWorker;
};
