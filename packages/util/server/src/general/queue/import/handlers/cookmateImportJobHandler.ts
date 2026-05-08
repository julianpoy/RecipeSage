/* eslint-disable @typescript-eslint/no-explicit-any */

import type { JobSummary } from "@recipesage/prisma";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, stat, mkdtempDisposable } from "fs/promises";
import { safeExtractZip } from "../../../safeExtractZip";
import xmljs from "xml-js";
import type { JobQueueItem } from "../../JobQueueItem";
import { ImportBadFormatError } from "../../../jobs/jobErrors";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";

export async function cookmateImportJobHandler(
  job: JobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for CookMate import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  const zipPath = downloaded.filePath;

  await using extractDir = await mkdtempDisposable("/tmp/");
  const extractPath = extractDir.path;
  await safeExtractZip(zipPath, extractPath);

  const fileNames = await readdir(extractPath);

  const filename = fileNames.find((filename) => filename.endsWith(".xml"));
  if (!filename) {
    throw new ImportBadFormatError();
  }

  const xml = await readFile(extractPath + "/" + filename, "utf8");
  const data = JSON.parse(xmljs.xml2json(xml, { compact: true, spaces: 4 }));

  const grabFieldText = (field: any) => {
    if (!field) return "";
    if (field.li && Array.isArray(field.li)) {
      return field.li.map((item: any) => item._text).join("\n");
    }

    return field._text || "";
  };

  const grabLabelTitles = (field: any) => {
    if (!field) return [];
    if (field._text) return [cleanLabelTitle(field._text)];
    if (Array.isArray(field) && field.length)
      return field.map((item) => cleanLabelTitle(item._text));

    return [];
  };

  const grabImagePaths = async (basePath: string, field: any) => {
    if (!field) return [];

    let originalPaths;
    if (field.path?._text || field._text)
      originalPaths = [field.path?._text || field._text];
    if (Array.isArray(field) && field.length)
      originalPaths = field.map((item) => item.path?._text || item._text);

    if (!originalPaths) return [];

    const paths = originalPaths
      .filter((e) => e)
      .map((originalPath) => originalPath.split("/").at(-1))
      .map((trimmedPath) => basePath + "/" + trimmedPath);

    const pathsOnDisk = [];
    for (const path of paths) {
      try {
        await stat(path);
        pathsOnDisk.push(path);
      } catch (_e) {
        // Do nothing, image does not exist in backup
      }
    }

    return pathsOnDisk;
  };

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = data.cookbook.recipe.length;
  let processedCount = 0;
  for (const cookmateRecipe of data.cookbook.recipe) {
    standardizedRecipeImportInput.push({
      recipe: {
        title: grabFieldText(cookmateRecipe.title),
        description: grabFieldText(cookmateRecipe.description),
        ingredients: grabFieldText(cookmateRecipe.ingredient),
        instructions: grabFieldText(cookmateRecipe.recipetext),
        yield: grabFieldText(cookmateRecipe.quantity),
        totalTime: grabFieldText(cookmateRecipe.totaltime),
        activeTime: grabFieldText(cookmateRecipe.preptime),
        notes: grabFieldText(cookmateRecipe.comments),
        source: grabFieldText(cookmateRecipe.source),
        folder: "main",
        url: grabFieldText(cookmateRecipe.url),
      },
      labels: [...grabLabelTitles(cookmateRecipe.category), ...importLabels],
      images: [
        ...(await grabImagePaths(
          extractPath + "/images",
          cookmateRecipe.imagepath,
        )),
        ...(await grabImagePaths(
          extractPath + "/images",
          cookmateRecipe.image,
        )),
      ],
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
