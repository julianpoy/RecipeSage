import type { Job } from "@prisma/client";
import { type JobMeta } from "@recipesage/prisma";
import {
  importJobFailCommon,
  importJobFinishCommon,
  JsonLD,
  jsonLDToStandardizedRecipeImportEntry,
  metrics,
} from "@recipesage/util/server/general";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readFile } from "fs/promises";
import type { JobQueueItem } from "./JobQueueItem";

export async function jsonldImportJobHandler(
  job: Job,
  queueItem: JobQueueItem,
): Promise<void> {
  const timer = metrics.jobFinished.startTimer();
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  try {
    if (!queueItem.s3StorageKey) {
      throw new Error("No S3 storage key provided for JSON-LD import");
    }

    // Download JSON-LD file from S3
    await using downloaded = await downloadS3ToTemp(queueItem.s3StorageKey);

    // Read and parse JSON-LD
    const fileContent = await readFile(downloaded.filePath, "utf-8");
    const input = JSON.parse(fileContent) as
      | JsonLD
      | JsonLD[]
      | { recipes: JsonLD[] };

    let jsonLD: JsonLD[];
    if (Array.isArray(input)) jsonLD = input;
    else if ("recipes" in input) jsonLD = input.recipes;
    else jsonLD = [input];

    // Filter for Recipe type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsonLD = jsonLD.filter((el: any) => el["@type"] === "Recipe");

    if (!jsonLD.length) {
      throw new Error(
        "Only supports JSON-LD or array of JSON-LD with type 'Recipe'",
      );
    }

    // Convert to standardized recipe format
    const standardizedRecipeImportInput = jsonLD.map((ld: JsonLD) => {
      const result = jsonLDToStandardizedRecipeImportEntry(ld);
      return {
        ...result,
        labels: [...result.labels, ...importLabels],
      };
    });

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
