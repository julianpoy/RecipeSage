import type { JobSummary } from "@recipesage/prisma";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readFile, stat, mkdtempDisposable } from "fs/promises";
import { safeExtractZip } from "../../../safeExtractZip";
import * as cheerio from "cheerio";
import type { JobQueueItem } from "../../JobQueueItem";
import { ImportBadFormatError } from "../../../jobs/jobErrors";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";

export async function recipekeeperImportJobHandler(
  job: JobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for RecipeKeeper import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  const zipPath = downloaded.filePath;

  await using extractDir = await mkdtempDisposable("/tmp/");
  const extractPath = extractDir.path;
  await safeExtractZip(zipPath, extractPath);

  const indexHtmlPath = extractPath + "/recipes.html";
  try {
    await stat(indexHtmlPath);
  } catch (_e) {
    throw new ImportBadFormatError();
  }
  const recipeHtml = await readFile(indexHtmlPath, "utf-8");

  const $ = cheerio.load(recipeHtml);
  const domList = $(".recipe-details").toArray();

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = domList.length;
  let processedCount = 0;
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

    const readNututritionProperty = (prop: string): string | undefined => {
      const el = $item.find(`[itemprop="${prop}"]`).first();
      if (!el.length) return undefined;
      return (el.attr("content") || el.text()).trim() || undefined;
    };
    const parseNumeric = (value: string | undefined): number | undefined => {
      if (!value) return undefined;
      const match = value.match(/-?\d+(?:\.\d+)?/);
      if (!match) return undefined;
      const parsed = parseFloat(match[0]);
      return isNaN(parsed) ? undefined : parsed;
    };
    const nutritionServingSize = readNututritionProperty(
      "recipeNutServingSize",
    );
    const nutritionCalories = parseNumeric(
      readNututritionProperty("recipeNutCalories"),
    );
    const nutritionTotalFat = parseNumeric(
      readNututritionProperty("recipeNutTotalFat"),
    );
    const nutritionSaturatedFat = parseNumeric(
      readNututritionProperty("recipeNutSaturatedFat"),
    );
    const nutritionCholesterol = parseNumeric(
      readNututritionProperty("recipeNutCholesterol"),
    );
    const nutritionSodium = parseNumeric(
      readNututritionProperty("recipeNutSodium"),
    );
    const nutritionTotalCarbs = parseNumeric(
      readNututritionProperty("recipeNutTotalCarbohydrate"),
    );
    const nutritionDietaryFiber = parseNumeric(
      readNututritionProperty("recipeNutDietaryFiber"),
    );
    const nutritionTotalSugars = parseNumeric(
      readNututritionProperty("recipeNutSugars"),
    );
    const nutritionProtein = parseNumeric(
      readNututritionProperty("recipeNutProtein"),
    );

    const unconfirmedImagePaths = [
      ...new Set(
        $item
          .find("img.recipe-photo, img.recipe-photos")
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
        nutritionServingSize,
        nutritionCalories,
        nutritionTotalFat,
        nutritionSaturatedFat,
        nutritionCholesterol,
        nutritionSodium,
        nutritionTotalCarbs,
        nutritionDietaryFiber,
        nutritionTotalSugars,
        nutritionProtein,
      },
      labels: [...labels, ...importLabels],
      images: imagePaths,
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
  });
}
