import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import {
  cleanLabelTitle,
  stripInlineFormatting,
} from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, mkdtempDisposable } from "fs/promises";
import { safeExtractZip } from "../../../safeExtractZip";
import path from "path";
import type { JobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";

export async function melaImportJobHandler(
  job: ImportJobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for Mela import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  const zipPath = downloaded.filePath;

  await using extractDir = await mkdtempDisposable("/tmp/");
  const extractPath = extractDir.path;
  await safeExtractZip(zipPath, extractPath);

  const recipeFiles = await collectMelaRecipeFiles(extractPath);

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = recipeFiles.length;
  let processedCount = 0;
  for (const filePath of recipeFiles) {
    try {
      const fileContents = await readFile(filePath, "utf8");
      const recipeData = JSON.parse(fileContents);

      const totalTime = mergeTotalAndCookTime(
        asString(recipeData.totalTime),
        asString(recipeData.cookTime),
      );

      const labels = Array.isArray(recipeData.categories)
        ? recipeData.categories
            .filter((e: unknown): e is string => typeof e === "string")
            .map((e: string) => cleanLabelTitle(e))
            .filter((e: string) => e)
        : [];

      const images = Array.isArray(recipeData.images)
        ? recipeData.images
            .filter((e: unknown): e is string => typeof e === "string" && !!e)
            .map((e: string) => Buffer.from(e, "base64"))
            .filter((b: Buffer) => b.length > 0)
        : [];

      const link = asString(recipeData.link).trim();
      const linkIsUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(link);

      standardizedRecipeImportInput.push({
        recipe: {
          title: asString(recipeData.title),
          description: plainField(recipeData.text),
          ingredients: sectionedField(recipeData.ingredients),
          instructions: sectionedField(recipeData.instructions),
          yield: asString(recipeData.yield),
          totalTime,
          activeTime: asString(recipeData.prepTime),
          notes: sectionedField(recipeData.notes),
          source: linkIsUrl ? "" : link,
          folder: "main",
          url: linkIsUrl ? link : "",
          nutritionOtherDetails: plainField(recipeData.nutrition) || undefined,
        },

        labels: [...labels, ...importLabels],
        images,
      });
    } catch (e) {
      console.warn(
        `Skipping unparseable Mela recipe file ${path.basename(filePath)}: ${e instanceof Error ? e.message : String(e)}`,
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
  });
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mergeTotalAndCookTime(totalTime: string, cookTime: string): string {
  if (totalTime && cookTime) return `${totalTime} (${cookTime} cooking time)`;
  return totalTime || cookTime;
}

function sectionedField(input: unknown): string {
  return convertMelaHeadersToSections(
    convertMelaMarkdownLinks(asString(input)),
  );
}

function plainField(input: unknown): string {
  return stripInlineFormatting(convertMelaMarkdownLinks(asString(input)));
}

function convertMelaMarkdownLinks(input: string): string {
  return input.replace(
    /\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)/g,
    (_match, label, url) => {
      const trimmed = url.trim();
      if (trimmed.startsWith("mela://")) return label;
      return `${label} (${trimmed})`;
    },
  );
}

function convertMelaHeadersToSections(input: string): string {
  return input.replace(/^[ \t]*#+[ \t]+(.+?)[ \t]*$/gm, (_match, content) => {
    const trimmed = content.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) return trimmed;
    return `[${trimmed}]`;
  });
}

async function collectMelaRecipeFiles(root: string): Promise<string[]> {
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
      } else if (
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".melarecipe")
      ) {
        results.push(entryPath);
      }
    }
  }
  return results;
}
