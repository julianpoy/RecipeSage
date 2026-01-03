import type { Job } from "@prisma/client";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import {
  importJobFailCommon,
  importJobFinishCommon,
  metrics,
} from "@recipesage/util/server/general";
import { gunzipPromise } from "@recipesage/util/server/storage";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, mkdtempDisposable } from "fs/promises";
import extract from "extract-zip";
import path from "path";
import type { JobQueueItem } from "./JobQueueItem";

export async function paprikaImportJobHandler(
  job: Job,
  queueItem: JobQueueItem,
): Promise<void> {
  const timer = metrics.jobFinished.startTimer();
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  try {
    if (!queueItem.s3StorageKey) {
      throw new Error("No S3 storage key provided for Paprika import");
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

      const fileBuf = await readFile(filePath);
      const fileContents = await gunzipPromise(fileBuf);

      const recipeData = JSON.parse(fileContents.toString());

      const notes = [
        recipeData.notes,
        recipeData.nutritional_info
          ? `Nutritional Info: ${recipeData.difficulty}`
          : "",
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
        },

        labels: [...labels, ...importLabels],
        images,
      });
    }

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
