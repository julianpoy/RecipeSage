import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, mkdtempDisposable } from "fs/promises";
import { safeExtractZip } from "../../../safeExtractZip";
import path from "path";
import type { JobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";

const CROUTON_QUANTITY_UNITS: Record<string, string> = {
  ITEM: "",
  TEASPOON: "tsp",
  TABLESPOON: "tbsp",
  CUP: "cup",
  MILLS: "ml",
  GRAMS: "g",
  KGS: "kg",
  POUND: "lb",
  OUNCE: "oz",
  LITRES: "L",
  DECILITER: "dl",
  BOTTLE: "bottle",
  PINCH: "pinch",
  CAN: "can",
  BUNCH: "bunch",
  PACKET: "packet",
};

export async function croutonImportJobHandler(
  job: ImportJobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for Crouton import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  const zipPath = downloaded.filePath;

  await using extractDir = await mkdtempDisposable("/tmp/");
  const extractPath = extractDir.path;
  await safeExtractZip(zipPath, extractPath);

  const recipeFiles = await collectCroutonRecipeFiles(extractPath);

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = recipeFiles.length;
  let processedCount = 0;
  for (const filePath of recipeFiles) {
    const fileContents = await readFile(filePath, "utf8");

    const recipeData = JSON.parse(fileContents);

    const title = typeof recipeData.name === "string" ? recipeData.name : "";

    const ingredients = formatCroutonIngredients(recipeData.ingredients);
    const instructions = formatCroutonSteps(recipeData.steps);

    const recipeYield =
      typeof recipeData.serves === "number" && recipeData.serves > 0
        ? `${recipeData.serves} servings`
        : "";

    const totalTime =
      typeof recipeData.duration === "number" && recipeData.duration > 0
        ? `${recipeData.duration} minutes`
        : "";

    const notes = typeof recipeData.notes === "string" ? recipeData.notes : "";

    const webLink =
      typeof recipeData.webLink === "string" ? recipeData.webLink.trim() : "";
    const webLinkIsUrl = /^https?:\/\//i.test(webLink);

    const nutritionRaw =
      typeof recipeData.neutritionalInfo === "string"
        ? recipeData.neutritionalInfo
        : typeof recipeData.nutritionalInfo === "string"
          ? recipeData.nutritionalInfo
          : "";
    const nutrition = nutritionRaw.trim();

    const labels = Array.isArray(recipeData.tags)
      ? recipeData.tags
          .filter((e: unknown): e is string => typeof e === "string")
          .map((e: string) => cleanLabelTitle(e))
          .filter((e: string) => e)
      : [];

    const images = Array.isArray(recipeData.images)
      ? recipeData.images
          .filter((e: unknown): e is string => typeof e === "string" && !!e)
          .map((e: string) => Buffer.from(e, "base64"))
      : [];

    standardizedRecipeImportInput.push({
      recipe: {
        title,
        description: "",
        ingredients,
        instructions,
        yield: recipeYield,
        totalTime,
        activeTime: "",
        notes,
        source: webLinkIsUrl ? "" : webLink,
        folder: "main",
        url: webLinkIsUrl ? webLink : "",
        nutritionOtherDetails: nutrition || undefined,
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

function formatCroutonIngredients(input: unknown): string {
  if (!Array.isArray(input)) return "";

  const sorted = [...input].sort((a, b) => {
    const ao = a && typeof a.order === "number" ? a.order : 0;
    const bo = b && typeof b.order === "number" ? b.order : 0;
    return ao - bo;
  });

  const lines: string[] = [];
  for (const entry of sorted) {
    if (!entry || typeof entry !== "object") continue;
    const name =
      entry.ingredient && typeof entry.ingredient.name === "string"
        ? entry.ingredient.name
        : "";

    const quantityType =
      entry.quantity && typeof entry.quantity.quantityType === "string"
        ? entry.quantity.quantityType
        : "";

    if (quantityType === "SECTION") {
      const headerText = toSectionHeaderText(name);
      if (headerText) lines.push(`[${headerText}]`);
      continue;
    }

    const amount =
      entry.quantity &&
      typeof entry.quantity.amount === "number" &&
      entry.quantity.amount > 0
        ? entry.quantity.amount.toString()
        : "";

    const unit = Object.prototype.hasOwnProperty.call(
      CROUTON_QUANTITY_UNITS,
      quantityType,
    )
      ? CROUTON_QUANTITY_UNITS[quantityType]
      : quantityType.toLowerCase();

    const line = [amount, unit, name].filter((e) => e).join(" ");
    if (line) lines.push(line);
  }

  return lines.join("\n");
}

function formatCroutonSteps(input: unknown): string {
  if (!Array.isArray(input)) return "";

  const sorted = [...input].sort((a, b) => {
    const ao = a && typeof a.order === "number" ? a.order : 0;
    const bo = b && typeof b.order === "number" ? b.order : 0;
    return ao - bo;
  });

  const lines: string[] = [];
  for (const entry of sorted) {
    if (!entry || typeof entry !== "object") continue;
    const text = typeof entry.step === "string" ? entry.step : "";
    if (!text) continue;

    if (entry.isSection === true) {
      const headerText = toSectionHeaderText(text);
      if (headerText) lines.push(`[${headerText}]`);
    } else {
      lines.push(text);
    }
  }

  return lines.join("\n");
}

function toSectionHeaderText(input: string): string {
  return input.replace(/\s*\n+\s*/g, " ").trim();
}

async function collectCroutonRecipeFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const current = stack.pop() as string;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".crumb")
      ) {
        results.push(entryPath);
      }
    }
  }
  return results;
}
