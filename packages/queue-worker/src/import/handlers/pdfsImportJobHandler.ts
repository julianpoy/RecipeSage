import type { Job } from "@prisma/client";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import {
  importJobFailCommon,
  importJobFinishCommon,
  metrics,
} from "@recipesage/util/server/general";
import { pdfToRecipe } from "@recipesage/util/server/ml";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, mkdtempDisposable } from "fs/promises";
import extract from "extract-zip";
import path from "path";
import type { JobQueueItem } from "./JobQueueItem";

export async function pdfsImportJobHandler(
  job: Job,
  queueItem: JobQueueItem,
): Promise<void> {
  const timer = metrics.jobFinished.startTimer();
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  try {
    if (!queueItem.s3StorageKey) {
      throw new Error("No S3 storage key provided for PDFs import");
    }

    await using downloaded = await downloadS3ToTemp(queueItem.s3StorageKey);
    const zipPath = downloaded.filePath;

    await using extractDir = await mkdtempDisposable("/tmp/");
    const extractPath = extractDir.path;
    await extract(zipPath, { dir: extractPath });

    const fileNames = await readdir(extractPath);

    const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];
    for (const fileName of fileNames) {
      const filePath = path.join(extractPath, fileName);

      if (!filePath.endsWith(".pdf")) {
        continue;
      }

      const recipePDF = await readFile(filePath);

      const images = [];
      const baseName = path.basename(fileName);
      const possibleImageNames = [
        `${baseName}.png`,
        `${baseName}.jpg`,
        `${baseName}.jpeg`,
      ];

      for (const possibleImageName of possibleImageNames) {
        try {
          const fileContents = await readFile(
            path.join(extractPath, possibleImageName),
            "base64",
          );
          images.push(fileContents);
        } catch (_e) {
          // Image doesn't exist
        }
      }

      const recipe = await pdfToRecipe(recipePDF);
      if (!recipe) {
        continue;
      }

      standardizedRecipeImportInput.push({
        ...recipe,
        images,
        labels: importLabels,
      });
    }

    await importJobFinishCommon({
      timer,
      job,
      userId: job.userId,
      standardizedRecipeImportInput,
      importTempDirectory: extractPath,
    });
  } catch (error) {
    await importJobFailCommon({
      timer,
      job,
      error,
    });
  }
}
