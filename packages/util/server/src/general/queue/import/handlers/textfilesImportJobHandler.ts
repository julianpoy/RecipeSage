import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { textToRecipe, TextToRecipeInputType } from "../../../../ml/index";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readSideCarImages } from "./shared/sideCarImages";
import { readdir, readFile, mkdtempDisposable } from "fs/promises";
import { safeExtractZip } from "../../../safeExtractZip";
import path from "path";
import {
  extractTextFromDocument,
  isExtractableDocumentExtension,
} from "../../../extractTextFromDocument";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";
import { ImportTooManyRecipesError } from "../../../jobs/jobErrors";

/**
 * A sanity limit so that we don't overload the service or run up a huge bill.
 */
const MAX_COUNT_LIMIT = 500;

export async function textfilesImportJobHandler(
  job: ImportJobSummary,
  queueItem: StandardJobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for TextFiles import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  const zipPath = downloaded.filePath;

  await using extractDir = await mkdtempDisposable("/tmp/");
  const extractPath = extractDir.path;
  await safeExtractZip(zipPath, extractPath);

  const fileNames = await readdir(extractPath);

  const documentFileNames = fileNames.filter((fileName) => {
    const extension = path.extname(fileName).toLowerCase();
    return extension === ".txt" || isExtractableDocumentExtension(extension);
  });

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = documentFileNames.length;
  if (totalCount > MAX_COUNT_LIMIT) {
    throw new ImportTooManyRecipesError();
  }

  let processedCount = 0;
  for (const fileName of documentFileNames) {
    const filePath = path.join(extractPath, fileName);
    const extension = path.extname(fileName).toLowerCase();

    const recipeText =
      extension === ".txt"
        ? await readFile(filePath, "utf-8")
        : await extractTextFromDocument(filePath);

    const images = await readSideCarImages(extractPath, fileName);

    const recipe = await textToRecipe(
      recipeText,
      TextToRecipeInputType.Document,
    );
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
    creditOperation: "importTextfiles",
  });
}
