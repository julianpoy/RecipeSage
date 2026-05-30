import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { gunzipPromise } from "../../../../storage/index";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, mkdtempDisposable } from "fs/promises";
import { safeExtractZip } from "../../../safeExtractZip";
import path from "path";
import type { JobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";

export async function paprikaImportJobHandler(
  job: ImportJobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for Paprika import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  const zipPath = downloaded.filePath;

  await using extractDir = await mkdtempDisposable("/tmp/");
  const extractPath = extractDir.path;
  await safeExtractZip(zipPath, extractPath);

  const fileNames = await readdir(extractPath);

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = fileNames.length;
  let processedCount = 0;
  for (const fileName of fileNames) {
    const filePath = path.join(extractPath, fileName);

    const fileBuf = await readFile(filePath);
    const fileContents = await gunzipPromise(fileBuf);

    const recipeData = JSON.parse(fileContents.toString());

    const notes = [
      recipeData.notes,
      recipeData.difficulty ? `Difficulty: ${recipeData.difficulty}` : "",
    ]
      .filter((e) => e && e.length > 0)
      .join("\n");

    const totalTime = [
      recipeData.total_time,
      recipeData.cook_time ? `(${recipeData.cook_time} cooking time)` : "",
    ]
      .filter((e) => e)
      .join(" ");

    const labels = (recipeData.categories || [])
      .map((e: string) => cleanLabelTitle(e))
      .filter((e: string) => e);

    // Supports only the first image at the moment
    const images = recipeData.photo_data
      ? [Buffer.from(recipeData.photo_data, "base64")]
      : [];

    standardizedRecipeImportInput.push({
      recipe: {
        title: recipeData.name,
        description: recipeData.description,
        ingredients: recipeData.ingredients,
        instructions: recipeData.directions,
        yield: recipeData.servings,
        rating: parseInt(recipeData.rating),
        totalTime,
        activeTime: recipeData.prep_time,
        notes,
        source: recipeData.source,
        folder: "main",
        url: recipeData.source_url,
        nutritionOtherDetails: recipeData.nutritional_info || undefined,
      },

      labels: [...labels, ...importLabels],
      images,
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
