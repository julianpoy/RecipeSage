import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import {
  ClipFetchError,
  ClipTimeoutError,
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
import pLimit from "p-limit";

/**
 * A sanity limit so that we don't overload the service or run up a huge bill.
 */
const MAX_COUNT_LIMIT = 100;

const CONCURRENT_CLIPS = 3;

const extractUrlFromLine = (line: string) => {
  const match = line.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return undefined;

  const url = match[0].replace(/[.,;:!?]+$/, "");
  if (url.endsWith(")") && !url.includes("(")) return url.slice(0, -1);
  return url;
};

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
    .map((line) => line.trim())
    .map((line) => extractUrlFromLine(line))
    .filter((url) => url !== undefined);

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
  const limit = pLimit(CONCURRENT_CLIPS);
  const clipResults = await Promise.all(
    urls.map((url) =>
      limit(async () => {
        try {
          return await clipUrl(url);
        } catch (e) {
          const isExpectedClipFailure =
            e instanceof ClipFetchError || e instanceof ClipTimeoutError;
          if (!isExpectedClipFailure) {
            Sentry.captureException(e, { extra: { jobId: job.id } });
          }
          return undefined;
        } finally {
          processedCount++;
          onProgress({
            processedCount,
            totalCount,
            step: 1,
            totalStepCount: IMPORT_JOB_STEP_COUNT,
          });
        }
      }),
    ),
  );

  let failedCount = 0;
  let recognizedCount = 0;
  const failedUrls: string[] = [];
  urls.forEach((url, index) => {
    const clipResult = clipResults[index];
    if (
      !clipResult ||
      (!clipResult.recipe.ingredients && !clipResult.recipe.instructions)
    ) {
      failedCount++;
      failedUrls.push(url);
      return;
    }

    standardizedRecipeImportInput.push({
      ...clipResult,
      labels: [...importLabels],
    });

    if (isRecipeRecognitionSuccess(clipResult.recipe)) {
      recognizedCount++;
    }
  });

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
