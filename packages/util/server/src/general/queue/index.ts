import { Worker, Queue } from "bullmq";
import * as Sentry from "@sentry/node";
import type { JobQueueItem } from "./JobQueueItem";
import { prisma } from "@recipesage/prisma";
import { JobStatus } from "@recipesage/prisma";

export * from "./JobQueueItem";
export * from "./processWorkerJob";

const JOB_QUEUE_NAME = "rsJobQueue";
const JOB_QUEUE_PREFIX = process.env.JOB_QUEUE_PREFIX || "rsJobQueue";

let jobQueue: Queue<JobQueueItem, void> | undefined;
export const getJobQueue = () => {
  if (jobQueue) return jobQueue;

  jobQueue = new Queue<JobQueueItem, void>(JOB_QUEUE_NAME, {
    connection: {
      host: process.env.JOB_QUEUE_REDIS_HOST,
      port: parseInt(process.env.JOB_QUEUE_REDIS_PORT || "6379"),
      enableOfflineQueue: false,
    },
    prefix: JOB_QUEUE_PREFIX,
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

export const enqueueJob = (item: JobQueueItem) => {
  return getJobQueue().add(`${Date.now()}-${Math.random()}`, item);
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
    connection: {
      host: process.env.JOB_QUEUE_REDIS_HOST,
      port: parseInt(process.env.JOB_QUEUE_REDIS_PORT || "6379"),
    },
    prefix: JOB_QUEUE_PREFIX,
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

  jobQueueWorker.on("failed", (job) => {
    console.log(`Job ${job?.id} has triggered the failed event`);

    if (job && "jobId" in job.data && job.data.jobId) {
      prisma.job
        .update({
          where: {
            id: job.data.jobId,
          },
          data: {
            status: JobStatus.FAIL,
          },
        })
        .catch((e) => {
          console.error(e);
          Sentry.captureException(e);
        });
    }
  });

  return jobQueueWorker;
};
