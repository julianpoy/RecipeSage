export interface JobQueueItem {
  jobId: string;
  s3StorageKey?: string;
  credentials?: {
    username: string;
    password: string;
  };
}
