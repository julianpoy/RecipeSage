export interface JobQueueItem {
  jobId: string;
  s3StorageKey?: string;
  credentials?: {
    username: string;
    password: string;
  };
  options?: {
    excludeImages?: boolean;
    includeStockRecipes?: boolean;
    includeTechniques?: boolean;
    canImportMultipleImages?: boolean;
  };
}
