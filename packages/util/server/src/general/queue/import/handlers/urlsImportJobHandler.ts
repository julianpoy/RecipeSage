import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import {
  clipUrl,
  importJobFinishCommon,
  isRecipeRecognitionSuccess,
} from "../../../index";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readFile } from "fs/promises";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";
import { ImportTooManyRecipesError } from "../../../jobs/jobErrors";
import * as Sentry from "@sentry/node";

/**
 * A sanity limit so that we don't overload the service or run up a huge bill.
 */
const MAX_COUNT_LIMIT = 100;

export async function urlsImportJobHandler(
  job: ImportJobSummary,
  queueItem: StandardJobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for URLs import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);

  const urlsText = await readFile(downloaded.filePath, "utf-8");
  const urls = urlsText
    .split("\n")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = urls.length;
  if (totalCount > MAX_COUNT_LIMIT) {
    throw new ImportTooManyRecipesError();
  }

  let processedCount = 0;
  let failedCount = 0;
  let recognizedCount = 0;
  const failedUrls: string[] = [];
  for (const url of urls) {
    try {
      const clipResults = await clipUrl(url);
      const { ingredients, instructions } = clipResults.recipe;

      if (!ingredients && !instructions) {
        failedCount++;
        failedUrls.push(url);
      } else {
        standardizedRecipeImportInput.push({
          ...clipResults,
          labels: [...importLabels],
        });

        if (isRecipeRecognitionSuccess(clipResults.recipe)) {
          recognizedCount++;
        }
      }
    } catch (e) {
      Sentry.captureException(e, { extra: { jobId: job.id } });
      failedCount++;
      failedUrls.push(url);
    }

    processedCount++;
    onProgress({
      processedCount,
      totalCount,
      step: 1,
      totalStepCount: IMPORT_JOB_STEP_COUNT,
    });
  }

  const shouldChargeCredits = recognizedCount > totalCount * 0.25;

  await importJobFinishCommon({
    job,
    userId: job.userId,
    standardizedRecipeImportInput,
    importTempDirectory: undefined,
    creditOperation: shouldChargeCredits ? "importUrls" : undefined,
    failedCount,
    failedUrls,
  });
}
