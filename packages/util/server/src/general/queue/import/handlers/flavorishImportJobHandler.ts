import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { convertFromISO8601Time } from "../../../convertFromISO8601Time";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, stat, mkdtempDisposable } from "fs/promises";
import { safeExtractZip } from "../../../safeExtractZip";
import path from "path";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";
import { ImportBadFormatError } from "../../../jobs/jobErrors";

const NUTRITION_FIELDS: [string, string][] = [
  ["nutrition_serving_size", "Serving size"],
  ["nutrition_calories", "Calories"],
  ["nutrition_fat_content", "Fat"],
  ["nutrition_saturated_fat_content", "Saturated fat"],
  ["nutrition_trans_fat_content", "Trans fat"],
  ["nutrition_unsaturated_fat_content", "Unsaturated fat"],
  ["nutrition_cholesterol_content", "Cholesterol"],
  ["nutrition_sodium_content", "Sodium"],
  ["nutrition_carbohydrate_content", "Carbohydrates"],
  ["nutrition_fiber_content", "Fiber"],
  ["nutrition_sugar_content", "Sugar"],
  ["nutrition_protein_content", "Protein"],
];

export async function flavorishImportJobHandler(
  job: ImportJobSummary,
  queueItem: StandardJobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];
  const language = jobMeta.language || "en-us";

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for Flavorish import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  const zipPath = downloaded.filePath;

  await using extractDir = await mkdtempDisposable("/tmp/");
  const extractPath = extractDir.path;
  await safeExtractZip(zipPath, extractPath);

  const recipeFiles = await collectFlavorishRecipeFiles(extractPath);

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = recipeFiles.length;
  let processedCount = 0;
  let failedCount = 0;
  for (const filePath of recipeFiles) {
    try {
      const fileContents = (await readFile(filePath, "utf8")).trim();
      const data = JSON.parse(fileContents);
      const recipe = data.recipe;

      if (!recipe || typeof recipe !== "object") {
        failedCount++;
        continue;
      }

      const prepMinutes = durationMinutes(
        recipe.prep_time_hours,
        recipe.prep_time_minutes,
      );
      const cookMinutes = durationMinutes(
        recipe.cook_time_hours,
        recipe.cook_time_minutes,
      );
      const explicitTotalMinutes = durationMinutes(
        recipe.total_time_hours,
        recipe.total_time_minutes,
      );

      const activeTime = formatMinutes(prepMinutes, language);
      const totalTime = formatMinutes(
        explicitTotalMinutes || prepMinutes + cookMinutes,
        language,
      );

      const servings =
        typeof recipe.servings === "number" && recipe.servings > 0
          ? `${recipe.servings} servings`
          : "";

      const labels = [
        ...toStringArray(recipe.category),
        ...toStringArray(recipe.cuisine),
        ...toStringArray(data.collections),
      ]
        .map((e) => cleanLabelTitle(e))
        .filter((e) => e);

      const nutrition = formatNutrition(recipe);

      const images = await collectImages(
        extractPath,
        data.imageFilename,
        recipe.image_url,
      );

      standardizedRecipeImportInput.push({
        recipe: {
          title: asString(recipe.title).trim(),
          description: asString(recipe.description).trim(),
          ingredients: formatEntries(data.ingredients),
          instructions: formatEntries(data.instructions),
          yield: servings,
          activeTime,
          totalTime,
          notes: asString(recipe.notes).trim(),
          source: asString(recipe.source_name).trim(),
          folder: "main",
          url: asString(recipe.source_url).trim(),
          nutritionOtherDetails: nutrition || undefined,
        },

        labels: [...labels, ...importLabels],
        images,
      });
    } catch (e) {
      failedCount++;
      console.warn(
        `Skipping unparseable Flavorish recipe file ${path.basename(filePath)}: ${e instanceof Error ? e.message : String(e)}`,
      );
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
    importTempDirectory: extractPath,
    failedCount,
  });
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((e: unknown): e is string => typeof e === "string" && !!e)
    : [];
}

function durationMinutes(hours: unknown, minutes: unknown): number {
  const h = typeof hours === "number" && hours > 0 ? hours : 0;
  const m = typeof minutes === "number" && minutes > 0 ? minutes : 0;
  return h * 60 + m;
}

function formatMinutes(totalMinutes: number, language: string): string {
  if (totalMinutes <= 0) return "";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let iso = "PT";
  if (hours) iso += `${hours}H`;
  if (minutes) iso += `${minutes}M`;
  return convertFromISO8601Time(iso, language);
}

function formatEntries(input: unknown): string {
  if (!Array.isArray(input)) return "";

  const sorted = [...input].sort((a, b) => {
    const ao = a && typeof a.sort_order === "number" ? a.sort_order : 0;
    const bo = b && typeof b.sort_order === "number" ? b.sort_order : 0;
    return ao - bo;
  });

  const lines: string[] = [];
  for (const entry of sorted) {
    if (!entry || typeof entry !== "object") continue;
    const text = asString(entry.text).trim();
    if (!text) continue;

    if (entry.is_group_header === true) {
      lines.push(`[${text.replace(/\s*\n+\s*/g, " ").trim()}]`);
    } else {
      lines.push(text);
    }
  }

  return lines.join("\n");
}

function formatNutrition(recipe: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, label] of NUTRITION_FIELDS) {
    const value = asString(recipe[key]).trim();
    if (value) lines.push(`${label}: ${value}`);
  }
  return lines.join("\n");
}

async function collectImages(
  extractPath: string,
  imageFilename: unknown,
  imageUrl: unknown,
): Promise<string[]> {
  const filename = asString(imageFilename).trim();
  if (filename) {
    const localPath = path.join(extractPath, "images", path.basename(filename));
    const localExists = await stat(localPath).then(
      () => true,
      () => false,
    );
    if (localExists) return [localPath];
  }

  const url = asString(imageUrl).trim();
  if (/^https?:\/\//i.test(url)) return [url];

  return [];
}

async function collectFlavorishRecipeFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const current = stack.pop();
    if (current === undefined) break;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "images" || entry.name === "__MACOSX") continue;
        stack.push(entryPath);
      } else if (
        entry.isFile() &&
        !entry.name.startsWith("._") &&
        entry.name.toLowerCase().endsWith(".json") &&
        entry.name.toLowerCase() !== "manifest.json"
      ) {
        results.push(entryPath);
      }
    }
  }
  return results;
}
