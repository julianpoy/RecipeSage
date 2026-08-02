import type { ImportJobSummary } from "@recipesage/prisma";

import {
  importJobFinishCommon,
  jsonLDToStandardizedRecipeImportEntry,
} from "../../../index";
import { collectRecipeNodes } from "../../../collectRecipeNodes";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readFile } from "fs/promises";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";
import {
  ImportBadFormatError,
  ImportNoRecipesError,
} from "../../../jobs/jobErrors";

export async function jsonldImportJobHandler(
  job: ImportJobSummary,
  queueItem: StandardJobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for JSON-LD import");
  }

  // Download JSON-LD file from S3
  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);

  // Read and parse JSON-LD
  const fileContent = (await readFile(downloaded.filePath, "utf-8")).trim();

  let input: unknown;
  try {
    input = JSON.parse(fileContent);
  } catch {
    throw new ImportBadFormatError();
  }

  const documents =
    input && typeof input === "object" && "recipes" in input
      ? input.recipes
      : input;

  const jsonLD = collectRecipeNodes(documents);

  // Convert to standardized recipe format
  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = jsonLD.length;
  let processedCount = 0;
  const standardizedRecipeImportInput = [];
  for (const ld of jsonLD) {
    const result = jsonLDToStandardizedRecipeImportEntry(ld);
    const { title, ingredients, instructions } = result.recipe;
    if (title || ingredients || instructions) {
      standardizedRecipeImportInput.push({
        ...result,
        labels: [...result.labels, ...importLabels],
      });
    }

    processedCount++;
    onProgress({
      processedCount,
      totalCount,
      step: 1,
      totalStepCount: IMPORT_JOB_STEP_COUNT,
    });
  }

  if (!standardizedRecipeImportInput.length) {
    throw new ImportNoRecipesError();
  }

  await importJobFinishCommon({
    job,
    userId: job.userId,
    standardizedRecipeImportInput,
    importTempDirectory: undefined,
  });
}
