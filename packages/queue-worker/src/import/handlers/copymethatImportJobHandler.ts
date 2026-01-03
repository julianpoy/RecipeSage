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
import { readFile, mkdtempDisposable, stat } from "fs/promises";
import extract from "extract-zip";
import * as cheerio from "cheerio";
import type { JobQueueItem } from "./JobQueueItem";

export async function copymethatImportJobHandler(
  job: Job,
  queueItem: JobQueueItem,
): Promise<void> {
  const timer = metrics.jobFinished.startTimer();
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  try {
    if (!queueItem.s3StorageKey) {
      throw new Error("No S3 storage key provided for CopyMeThat import");
    }

    await using downloaded = await downloadS3ToTemp(queueItem.s3StorageKey);
    const zipPath = downloaded.filePath;

    await using extractDir = await mkdtempDisposable("/tmp/");
    const extractPath = extractDir.path;
    await extract(zipPath, { dir: extractPath });

    const recipeHtml = await readFile(extractPath + "/recipes.html", "utf-8");

    const $ = cheerio.load(recipeHtml);
    const domList = $(".recipe").toArray();

    const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

    for (const domItem of domList) {
      const $item = $(domItem);

      const title = $item.find("#name").text().trim() || "Untitled";
      const description = $item.find("#description").text().trim() || undefined;
      const sourceUrl = $item.find("#original_link").attr("href");
      const rating =
        parseInt($item.find("#ratingValue").text().trim() || "NaN") ||
        undefined;
      const servings = $item.find("#recipeYield").text().trim() || undefined;

      const ingredients = $item
        .find(".recipeIngredient")
        .map((_, el) => $(el).text().trim())
        .get()
        .join("\n");

      const instructions = $item
        .find(".instruction")
        .map((_, el) => $(el).text().trim())
        .get()
        .join("\n");

      const notes = $item.find("#recipeNotes").text() || undefined;

      const labels = $item
        .find("extra_info")
        .children()
        .map((_, el) => $(el).attr("id"))
        .get()
        .filter(Boolean)
        .filter((el) => el !== "rating");

      const unconfirmedImagePaths = [
        ...new Set(
          $item
            .find("img")
            .map((_, el) => $(el).attr("src"))
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
          // Do nothing, image excluded
        }
      }

      standardizedRecipeImportInput.push({
        recipe: {
          title,
          description,
          ingredients,
          instructions,
          yield: servings,
          notes,
          url: sourceUrl,
          folder: "main",
          rating,
        },
        labels: [...labels.map(cleanLabelTitle), ...importLabels],
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
