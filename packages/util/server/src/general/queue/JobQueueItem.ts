export interface StandardJobQueueItem {
  jobId: string;
  storageKey?: string;
  credentials?: {
    username: string;
    password: string;
  };
}

export interface DiscoverModerationJobQueueItem {
  discoverModeration: {
    discoverRecipeId: string;
  };
}

export type JobQueueItem =
  | StandardJobQueueItem
  | DiscoverModerationJobQueueItem;
