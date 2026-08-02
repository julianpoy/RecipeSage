import type { ImportJobSummary } from "@recipesage/prisma";

import {
  importJobFinishCommon,
  JsonLD,
  jsonLDToStandardizedRecipeImportEntry,
} from "../../../index";
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

  let input: JsonLD | JsonLD[] | { recipes: JsonLD[] };
  try {
    input = JSON.parse(fileContent);
  } catch {
    throw new ImportBadFormatError();
  }

  let jsonLD: JsonLD[];
  if (Array.isArray(input)) jsonLD = input;
  else if ("recipes" in input) jsonLD = input.recipes;
  else jsonLD = [input];

  // Filter for Recipe type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonLD = jsonLD.filter((el: any) => el["@type"] === "Recipe");

  if (!jsonLD.length) {
    throw new ImportNoRecipesError();
  }

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
    standardizedRecipeImportInput.push({
      ...result,
      labels: [...result.labels, ...importLabels],
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
    importTempDirectory: undefined,
  });
}
