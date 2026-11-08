import type { ImageDeletionJobQueueItem } from "./ImageDeletionJobQueueItem";
import { getImageDeletionQueue } from "./getImageDeletionQueue";

const IMAGE_DELETION_BATCH_SIZE = 500;

export const enqueueImageDeletion = async (
  imageIds: string[],
  imageOwnerUserId: string | null,
) => {
  const uniqueImageIds = [...new Set(imageIds)];
  if (!uniqueImageIds.length) return;

  const jobs: { name: string; data: ImageDeletionJobQueueItem }[] = [];
  for (
    let idx = 0;
    idx < uniqueImageIds.length;
    idx += IMAGE_DELETION_BATCH_SIZE
  ) {
    jobs.push({
      name: `${Date.now()}-${Math.random()}`,
      data: {
        imageIds: uniqueImageIds.slice(idx, idx + IMAGE_DELETION_BATCH_SIZE),
        imageOwnerUserId,
      },
    });
  }

  await getImageDeletionQueue().addBulk(jobs);
};
