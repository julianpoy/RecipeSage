export interface ImageDeletionJobQueueItem {
  imageIds: string[];
  imageOwnerUserId: string | null;
}
