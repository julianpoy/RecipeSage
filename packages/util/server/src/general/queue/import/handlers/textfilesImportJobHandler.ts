import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { textToRecipe, TextToRecipeInputType } from "../../../../ml/index";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readSideCarImages } from "./shared/sideCarImages";
import {
  buildUnstructuredRecipeEntry,
  getUnformattedImportLabel,
} from "./shared/unstructuredRecipeEntry";
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
import * as Sentry from "@sentry/node";

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

  const unformattedLabel = await getUnformattedImportLabel(jobMeta.language);

  let processedCount = 0;
  let partialCount = 0;
  let failedCount = 0;
  for (const fileName of documentFileNames) {
    try {
      const filePath = path.join(extractPath, fileName);
      const extension = path.extname(fileName).toLowerCase();

      const recipeText =
        extension === ".txt"
          ? (await readFile(filePath, "utf-8")).trim()
          : await extractTextFromDocument(filePath);

      const images = await readSideCarImages(extractPath, fileName);

      let entry: StandardizedRecipeImportEntry | undefined;
      try {
        const recipe = await textToRecipe(
          recipeText,
          TextToRecipeInputType.Document,
        );
        if (recipe) {
          entry = {
            ...recipe,
            images,
            labels: [...importLabels],
          };
        }
      } catch (e) {
        Sentry.captureException(e, { extra: { jobId: job.id } });
      }

      if (!entry) {
        entry = buildUnstructuredRecipeEntry({
          title: path.basename(fileName, path.extname(fileName)),
          notes: recipeText,
          labels: [...importLabels, unformattedLabel],
          images,
        });
        partialCount++;
      }

      standardizedRecipeImportInput.push(entry);
    } catch (e) {
      Sentry.captureException(e, { extra: { jobId: job.id } });
      failedCount++;
    }

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
    partialCount,
    failedCount,
  });
}
