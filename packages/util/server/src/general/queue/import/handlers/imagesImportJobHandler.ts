import type { JobSummary } from "@recipesage/prisma";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { ocrImagesToRecipe } from "../../../../ml/index";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, mkdtempDisposable } from "fs/promises";
import { safeExtractZip } from "../../../safeExtractZip";
import path from "path";
import type { JobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";
import { ImportTooManyRecipesError } from "../../../jobs/jobErrors";

/**
 * A sanity limit so that we don't overload the service or run up a huge bill.
 */
const MAX_COUNT_LIMIT = 100;

const SUPPORTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
  ".avif",
]);

export async function imagesImportJobHandler(
  job: JobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for Images import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  const zipPath = downloaded.filePath;

  await using extractDir = await mkdtempDisposable("/tmp/");
  const extractPath = extractDir.path;
  await safeExtractZip(zipPath, extractPath);

  const fileNames = await readdir(extractPath);

  const imageFileNames = fileNames.filter((fileName) =>
    SUPPORTED_EXTENSIONS.has(path.extname(fileName).toLowerCase()),
  );

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = imageFileNames.length;
  if (totalCount > MAX_COUNT_LIMIT) {
    throw new ImportTooManyRecipesError();
  }

  let processedCount = 0;
  for (const fileName of imageFileNames) {
    const filePath = path.join(extractPath, fileName);

    const recipeImageBuffer = await readFile(filePath);
    const images = [];
    images.push(filePath);

    const recipe = await ocrImagesToRecipe([recipeImageBuffer]);
    if (!recipe) {
      continue;
    }

    standardizedRecipeImportInput.push({
      ...recipe,
      images,
      labels: importLabels,
    });

    processedCount++;
    onProgress({
      processedCount,
      totalCount,
      step: 1,
      totalStepCount: IMPORT_JOB_STEP_COUNT,
    });
  }

  await importJobFinishCommon({
    job,
    userId: job.userId,
    standardizedRecipeImportInput,
    importTempDirectory: extractPath,
  });
}
