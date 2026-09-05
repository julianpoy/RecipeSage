import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { gunzipPromise } from "../../../../storage/index";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, mkdtempDisposable } from "fs/promises";
import { safeExtractZip } from "../../../safeExtractZip";
import path from "path";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";
import { ImportBadFormatError } from "../../../jobs/jobErrors";
import * as Sentry from "@sentry/node";

const PAPRIKA_RECIPE_EXTENSION = ".paprikarecipe";
const APPLE_DOUBLE_PREFIX = "._";

async function collectPaprikaRecipeFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const current = stack.pop();
    if (current === undefined) break;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        stack.push(entryPath);
      } else if (entry.isFile()) {
        if (entry.name.startsWith(APPLE_DOUBLE_PREFIX)) continue;
        if (entry.name === ".DS_Store") continue;
        results.push(entryPath);
      }
    }
  }

  const recipeFiles = results.filter((filePath) =>
    filePath.toLowerCase().endsWith(PAPRIKA_RECIPE_EXTENSION),
  );

  return recipeFiles.length > 0 ? recipeFiles : results;
}

export async function paprikaImportJobHandler(
  job: ImportJobSummary,
  queueItem: StandardJobQueueItem,
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

  const filePaths = await collectPaprikaRecipeFiles(extractPath);

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = filePaths.length;
  let processedCount = 0;
  let failedCount = 0;
  for (const filePath of filePaths) {
    try {
      const fileBuf = await readFile(filePath);
      const fileContents = await gunzipPromise(fileBuf);
      const recipeData = JSON.parse(fileContents.toString().trim());

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

      const photos: { data?: string }[] = Array.isArray(recipeData.photos)
        ? recipeData.photos
        : [];

      const photoData = photos
        .filter(
          (photo): photo is { data: string } =>
            !!photo && typeof photo.data === "string" && photo.data.length > 0,
        )
        .map((photo) => Buffer.from(photo.data, "base64"));

      const images =
        photoData.length > 0
          ? photoData
          : recipeData.photo_data
            ? [Buffer.from(recipeData.photo_data, "base64")]
            : [];

      standardizedRecipeImportInput.push({
        recipe: {
          title: recipeData.name,
          description: recipeData.description,
          ingredients: recipeData.ingredients,
          instructions: recipeData.directions,
          yield: recipeData.servings,
          rating: parseInt(recipeData.rating) || undefined,
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

  if (!standardizedRecipeImportInput.length && failedCount > 0) {
    throw new ImportBadFormatError();
  }

  await importJobFinishCommon({
    job,
    userId: job.userId,
    standardizedRecipeImportInput,
    importTempDirectory: undefined,
    failedCount,
  });
}
