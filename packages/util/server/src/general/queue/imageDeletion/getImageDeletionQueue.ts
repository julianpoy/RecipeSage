import { Queue } from "bullmq";
import * as Sentry from "@sentry/node";
import type { ImageDeletionJobQueueItem } from "./ImageDeletionJobQueueItem";
import { getQueueRedisOptions } from "../getQueueRedisOptions";

export const IMAGE_DELETION_QUEUE_NAME = "rsImageDeletionQueue";

const IMAGE_DELETION_START_DELAY_MS = 300000;
const IMAGE_DELETION_ATTEMPTS = 10;
const IMAGE_DELETION_BACKOFF_DELAY_MS = 5000;
const IMAGE_DELETION_BACKOFF_JITTER = 0.5;

let imageDeletionQueue: Queue<ImageDeletionJobQueueItem, void> | undefined;
export const getImageDeletionQueue = () => {
  if (imageDeletionQueue) return imageDeletionQueue;

  const { connection, prefix } = getQueueRedisOptions();

  imageDeletionQueue = new Queue<ImageDeletionJobQueueItem, void>(
    IMAGE_DELETION_QUEUE_NAME,
    {
      connection: {
        ...connection,
        enableOfflineQueue: false,
      },
      prefix,
      defaultJobOptions: {
        delay: IMAGE_DELETION_START_DELAY_MS,
        attempts: IMAGE_DELETION_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: IMAGE_DELETION_BACKOFF_DELAY_MS,
          jitter: IMAGE_DELETION_BACKOFF_JITTER,
        },
      },
    },
  );

  imageDeletionQueue.on("error", (err) => {
    Sentry.captureException(err);
    console.error(err);
  });

  return imageDeletionQueue;
};
