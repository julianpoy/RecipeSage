import { Worker, Queue, type JobsOptions } from "bullmq";
import * as Sentry from "@sentry/node";
import type { JobQueueItem } from "./JobQueueItem";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import { markJobFailed } from "../jobs/markJobFailed";
import { getQueueRedisOptions } from "./getQueueRedisOptions";

export * from "./JobQueueItem";
export * from "./processWorkerJob";
export * from "./imageDeletion/enqueueImageDeletion";
export * from "./imageDeletion/getImageDeletionQueueWorker";

const JOB_QUEUE_NAME = "rsJobQueue";

let jobQueue: Queue<JobQueueItem, void> | undefined;
export const getJobQueue = () => {
  if (jobQueue) return jobQueue;

  const { connection, prefix } = getQueueRedisOptions();

  jobQueue = new Queue<JobQueueItem, void>(JOB_QUEUE_NAME, {
    connection: {
      ...connection,
      enableOfflineQueue: false,
    },
    prefix,
  });

  jobQueue.on("error", (err) => {
    Sentry.captureException(err);
    console.error(err);
  });

  jobQueue.on("waiting", (job) => {
    console.log(`Job ${job.id} is waiting to be processed`);
  });

  return jobQueue;
};

export const enqueueJob = (item: JobQueueItem, options?: JobsOptions) => {
  return getJobQueue().add(`${Date.now()}-${Math.random()}`, item, options);
};

let jobQueueWorker: Worker<JobQueueItem, void> | undefined;
export const getJobQueueWorker = () => {
  if (jobQueueWorker) return jobQueueWorker;

  const WORKER_PATH = process.env.JOB_QUEUE_WORKER_PATH;
  if (!WORKER_PATH)
    throw new Error(
      "WORKER_PATH must be provided for worker-dependent services",
    );

  jobQueueWorker = new Worker<JobQueueItem, void>(JOB_QUEUE_NAME, WORKER_PATH, {
    autorun: false,
    ...getQueueRedisOptions(),
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 50 },
    concurrency: parseInt(process.env.JOB_QUEUE_CONCURRENCY || "1"),
    useWorkerThreads: false,
  });

  jobQueueWorker.on("error", (err) => {
    Sentry.captureException(err);
    console.error(err);
  });

  jobQueueWorker.on("drained", () => {
    console.log(`Job queue has drained`);
  });

  jobQueueWorker.on("completed", (job) => {
    console.log(`Job ${job.id} has triggered the completed event`);
  });

  jobQueueWorker.on("failed", (job, error) => {
    console.log(`Job ${job?.id} has triggered the failed event`);

    if (job && "jobId" in job.data && job.data.jobId) {
      const jobId = job.data.jobId;

      console.error(error);
      Sentry.captureException(error, {
        extra: {
          jobId,
          queueJobId: job.id,
          attemptsMade: job.attemptsMade,
        },
      });

      markJobFailed(jobId, JOB_RESULT_CODES.interrupted).catch((e) => {
        console.error(e);
        Sentry.captureException(e);
      });
    }
  });

  return jobQueueWorker;
};
