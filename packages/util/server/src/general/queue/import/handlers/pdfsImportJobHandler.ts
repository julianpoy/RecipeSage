import type { JobSummary } from "@recipesage/prisma";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { pdfToRecipe } from "../../../../ml/index";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readSideCarImages } from "./shared/sideCarImages";
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

export async function pdfsImportJobHandler(
  job: JobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for PDFs import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  const zipPath = downloaded.filePath;

  await using extractDir = await mkdtempDisposable("/tmp/");
  const extractPath = extractDir.path;
  await safeExtractZip(zipPath, extractPath);

  const fileNames = await readdir(extractPath);

  const pdfFileNames = fileNames.filter(
    (fileName) => path.extname(fileName).toLowerCase() === ".pdf",
  );

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = pdfFileNames.length;
  if (totalCount > MAX_COUNT_LIMIT) {
    throw new ImportTooManyRecipesError();
  }

  let processedCount = 0;
  for (const fileName of pdfFileNames) {
    const filePath = path.join(extractPath, fileName);

    const recipePDF = await readFile(filePath);

    const images = await readSideCarImages(extractPath, fileName);

    const recipe = await pdfToRecipe(recipePDF);
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
