import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readFile, mkdtempDisposable, stat } from "fs/promises";
import { safeExtractZip } from "../../../safeExtractZip";
import { parseCopymethatHtml } from "./shared/parseCopymethatHtml";
import type { JobQueueItem } from "../../JobQueueItem";
import { ImportBadFormatError } from "../../../jobs/jobErrors";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";

export async function copymethatImportJobHandler(
  job: ImportJobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for CopyMeThat import");
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

  const parsedRecipes = parseCopymethatHtml(recipeHtml);

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = parsedRecipes.length;
  let processedCount = 0;
  for (const parsed of parsedRecipes) {
    const imagePaths: string[] = [];
    for (const src of parsed.imageSrcs) {
      const imagePath = extractPath + "/" + src;
      try {
        await stat(imagePath);
        imagePaths.push(imagePath);
      } catch (_e) {
        // Do nothing, image excluded
      }
    }

    standardizedRecipeImportInput.push({
      recipe: {
        title: parsed.title,
        description: parsed.description,
        ingredients: parsed.ingredients,
        instructions: parsed.instructions,
        yield: parsed.servings,
        notes: parsed.notes,
        url: parsed.sourceUrl,
        folder: "main",
        rating: parsed.rating,
      },
      labels: [...parsed.labels, ...importLabels],
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
