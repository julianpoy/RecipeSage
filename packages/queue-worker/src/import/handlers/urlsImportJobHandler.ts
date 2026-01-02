import { type Job, JobStatus } from "@prisma/client";
import { prisma, type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import {
  clipUrl,
  importJobFailCommon,
  importJobFinishCommon,
  throttleDropPromise,
} from "@recipesage/util/server/general";
import { metrics } from "@recipesage/util/server/general";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readFile } from "fs/promises";
import * as Sentry from "@sentry/node";
import type { JobQueueItem } from "./JobQueueItem";

const JOB_PROGRESS_UPDATE_PERIOD_SECONDS = 3;

export async function urlsImportJobHandler(
  job: Job,
  queueItem: JobQueueItem,
): Promise<void> {
  const timer = metrics.jobFinished.startTimer();
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  try {
    if (!queueItem.s3StorageKey) {
      throw new Error("No S3 storage key provided for URLs import");
    }

    await using downloaded = await downloadS3ToTemp(queueItem.s3StorageKey);

    const urlsText = await readFile(downloaded.filePath, "utf-8");
    const urls = urlsText.split("\n").filter((url) => url.trim().length > 0);

    const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

    const onClipProgress = throttleDropPromise(
      async (processed: number, totalCount: number) => {
        try {
          await prisma.job.updateMany({
            where: {
              id: job.id,
              status: JobStatus.RUN,
            },
            data: {
              progress: Math.max(
                Math.floor((processed / totalCount) * 100) / 2,
                1,
              ),
            },
          });
        } catch (e) {
          Sentry.captureException(e);
          console.error(e);
        }
      },
      JOB_PROGRESS_UPDATE_PERIOD_SECONDS * 1000,
    );

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      try {
        const clipResults = await clipUrl(url);
        standardizedRecipeImportInput.push({
          ...clipResults,
          labels: importLabels,
        });
      } catch (_e) {
        // Skip entry
      }

      onClipProgress(i, urls.length);
    }

    await importJobFinishCommon({
      timer,
      job,
      userId: job.userId,
      standardizedRecipeImportInput,
      importTempDirectory: undefined,
    });
  } catch (error) {
    await importJobFailCommon({
      timer,
      job,
      error,
    });
  }
}
