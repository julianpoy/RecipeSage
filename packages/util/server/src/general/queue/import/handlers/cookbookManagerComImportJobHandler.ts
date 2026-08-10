import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { convertFromISO8601Time } from "../../../convertFromISO8601Time";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, mkdtempDisposable } from "fs/promises";
import { safeExtractZip } from "../../../safeExtractZip";
import path from "path";
import { parse as parseYaml } from "yaml";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";

const ISO8601_DURATION =
  /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

export async function cookbookManagerComImportJobHandler(
  job: ImportJobSummary,
  queueItem: StandardJobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];
  const language = jobMeta.language || "en-us";

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for CookBook Manager import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  const zipPath = downloaded.filePath;

  await using extractDir = await mkdtempDisposable("/tmp/");
  const extractPath = extractDir.path;
  await safeExtractZip(zipPath, extractPath);

  const recipeFiles = await collectRecipeFiles(extractPath);

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
      const recipeData = parseYaml(fileContents);

      if (
        !recipeData ||
        typeof recipeData !== "object" ||
        Array.isArray(recipeData)
      ) {
        failedCount++;
        continue;
      }

      const title = asString(recipeData.name).trim();
      const ingredients = formatLines(recipeData.ingredients);
      const instructions = formatLines(recipeData.directions);
      if (!title && !ingredients && !instructions) {
        failedCount++;
        continue;
      }

      const prepMinutes = isoDurationToMinutes(recipeData.prep_time);
      const cookMinutes = isoDurationToMinutes(recipeData.cook_time);
      const otherMinutes = isoDurationToMinutes(recipeData.other_time);

      const activeTime = prepMinutes
        ? convertFromISO8601Time(minutesToISODuration(prepMinutes), language)
        : "";
      const totalMinutes = prepMinutes + cookMinutes + otherMinutes;
      const totalTime = totalMinutes
        ? convertFromISO8601Time(minutesToISODuration(totalMinutes), language)
        : "";

      const labels = Array.isArray(recipeData.tags)
        ? recipeData.tags
            .filter((e: unknown): e is string => typeof e === "string")
            .map((e: string) => cleanLabelTitle(e))
            .filter((e: string) => e)
        : [];

      const notes = buildNotes(recipeData.notes, recipeData.video);

      const source = asString(recipeData.source).trim();

      const nutrition = asString(recipeData.nutrition).trim();

      const rating =
        typeof recipeData.rating === "number" &&
        recipeData.rating >= 1 &&
        recipeData.rating <= 5
          ? Math.round(recipeData.rating)
          : undefined;

      standardizedRecipeImportInput.push({
        recipe: {
          title,
          description: asString(recipeData.description).trim(),
          ingredients,
          instructions,
          yield: asString(recipeData.servings).trim(),
          activeTime,
          totalTime,
          notes,
          source,
          folder: "main",
          rating,
          lastMadeAt: toDatestamp(recipeData.last_cook),
          nutritionOtherDetails: nutrition || undefined,
        },

        labels: [...labels, ...importLabels],
        images: collectImageUrls(recipeData),
      });
    } catch (e) {
      failedCount++;
      console.warn(
        `Skipping unparseable CookBook Manager recipe file ${path.basename(filePath)}: ${e instanceof Error ? e.message : String(e)}`,
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

  await importJobFinishCommon({
    job,
    userId: job.userId,
    standardizedRecipeImportInput,
    importTempDirectory: undefined,
    failedCount,
  });
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isoDurationToMinutes(value: unknown): number {
  if (typeof value !== "string") return 0;
  const match = value.trim().match(ISO8601_DURATION);
  if (!match) return 0;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  return days * 1440 + hours * 60 + minutes + seconds / 60;
}

function minutesToISODuration(totalMinutes: number): string {
  const total = Math.round(totalMinutes);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  let out = "PT";
  if (hours) out += `${hours}H`;
  if (minutes) out += `${minutes}M`;
  return out === "PT" ? "PT0M" : out;
}

function formatLines(input: unknown): string {
  if (!Array.isArray(input)) return "";

  const lines: string[] = [];
  for (const item of input) {
    const line = asString(item).trim();
    if (!line) continue;

    if (line.endsWith(":")) {
      const header = line.replace(/:+$/, "").trim();
      if (header) {
        lines.push(`[${header}]`);
        continue;
      }
    }

    lines.push(line);
  }

  return lines.join("\n");
}

function buildNotes(notesInput: unknown, videoInput: unknown): string {
  const parts: string[] = [];
  const notes = asString(notesInput).trim();
  if (notes) parts.push(notes);
  const video = asString(videoInput).trim();
  if (video) parts.push(video);
  return parts.join("\n\n");
}

function toDatestamp(value: unknown): string | undefined {
  const raw = value instanceof Date ? value.toISOString() : asString(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
}

function collectImageUrls(recipeData: Record<string, unknown>): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  const primary = asString(recipeData.image).trim();
  if (primary) {
    urls.push(primary);
    seen.add(primary);
  }

  if (Array.isArray(recipeData.images)) {
    for (const entry of recipeData.images) {
      const url = asString(entry).trim();
      if (url && !seen.has(url)) {
        urls.push(url);
        seen.add(url);
      }
    }
  }

  return urls;
}

async function collectRecipeFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const current = stack.pop();
    if (current === undefined) break;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        const name = entry.name.toLowerCase();
        if (name.endsWith(".yml") || name.endsWith(".yaml")) {
          results.push(entryPath);
        }
      }
    }
  }
  return results;
}
