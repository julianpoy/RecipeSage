import type { Job } from "@prisma/client";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import {
  importJobFailCommon,
  importJobFinishCommon,
  metrics,
} from "@recipesage/util/server/general";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readFile, stat, mkdtempDisposable } from "fs/promises";
import extract from "extract-zip";
import * as cheerio from "cheerio";
import type { JobQueueItem } from "./JobQueueItem";

export async function recipekeeperImportJobHandler(
  job: Job,
  queueItem: JobQueueItem,
): Promise<void> {
  const timer = metrics.jobFinished.startTimer();
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  try {
    if (!queueItem.s3StorageKey) {
      throw new Error("No S3 storage key provided for RecipeKeeper import");
    }

    await using downloaded = await downloadS3ToTemp(queueItem.s3StorageKey);
    const zipPath = downloaded.filePath;

    await using extractDir = await mkdtempDisposable("/tmp/");
    const extractPath = extractDir.path;
    await extract(zipPath, { dir: extractPath });

    const recipeHtml = await readFile(extractPath + "/recipes.html", "utf-8");

    const $ = cheerio.load(recipeHtml);
    const domList = $(".recipe-details").toArray();

    const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

    for (const domItem of domList) {
      const $item = $(domItem);

      const title = $item.find('[itemprop="name"]').text().trim() || "Untitled";
      const source =
        $item.find('[itemprop="recipeSource"]').text().trim() || undefined;
      const rating =
        parseInt(
          $item.find('[itemprop="recipeRating"]').attr("content")?.trim() ||
            "NaN",
        ) || undefined;
      const servings =
        $item.find('[itemprop="recipeYield"]').text().trim() || undefined;
      const activeTime =
        $item.find('[itemprop="prepTime"]').text().trim() || undefined;
      let totalTime =
        $item.find('[itemprop="cookTime"]').text().trim() || undefined;
      if (totalTime?.trim()) {
        totalTime += " Cook Time";
      }
      const ingredients = $item
        .find('[itemprop="recipeIngredients"]')
        .text()
        .split("\n")
        .map((ingredient) => ingredient.trim())
        .join("\n");

      const instructions = $item
        .find('[itemprop="recipeDirections"]')
        .text()
        .trim()
        .split("\n")
        .map((instruction) =>
          instruction
            .trim()
            .replaceAll(/^\d+. /g, "")
            .trim(),
        )
        .join("\n");

      const categories = $item
        .find('[itemprop="recipeCategory"]')
        .map((_, el) => $(el).attr("content"))
        .get()
        .filter(Boolean);
      const courses = $item
        .find('[itemprop="recipeCourse"]')
        .map((_, el) => $(el).text())
        .get()
        .filter(Boolean);
      const isFavorite =
        $item.find('[itemprop="recipeIsFavourite"]').attr("content") === "True";
      const labels = [...categories, ...courses, isFavorite ? "favorite" : ""]
        .filter((e): e is string => !!e)
        .map((e) => cleanLabelTitle(e));

      const unconfirmedImagePaths = [
        ...new Set(
          $item
            .find('[itemprop="recipeImage"]')
            .map((_, el) => $(el).attr("content"))
            .get()
            .filter(Boolean),
        ),
      ].map((src) => extractPath + "/" + src);

      const imagePaths: string[] = [];
      for (const imagePath of unconfirmedImagePaths) {
        try {
          await stat(imagePath);
          imagePaths.push(imagePath);
        } catch (_e) {
          // Image doesn't exist
        }
      }

      standardizedRecipeImportInput.push({
        recipe: {
          title,
          source,
          rating,
          yield: servings,
          activeTime,
          totalTime,
          ingredients,
          instructions,
        },
        labels: [...labels, ...importLabels],
        images: imagePaths,
      });
    }

    await importJobFinishCommon({
      timer,
      job,
      userId: job.userId,
      standardizedRecipeImportInput,
      importTempDirectory: extractPath,
    });
  } catch (error) {
    await importJobFailCommon({
      timer,
      job,
      error,
    });
  }
}
