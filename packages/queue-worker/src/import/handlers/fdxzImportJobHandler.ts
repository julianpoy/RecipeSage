/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Job } from "@prisma/client";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import {
  ImportBadFormatError,
  importJobFailCommon,
  importJobFinishCommon,
  metrics,
} from "@recipesage/util/server/general";
import { userHasCapability } from "@recipesage/util/server/capabilities";
import { cleanLabelTitle, Capabilities } from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readdir, readFile, mkdtempDisposable, stat } from "fs/promises";
import extract from "extract-zip";
import xmljs from "xml-js";
import path from "path";
import type { JobQueueItem } from "./JobQueueItem";

// Convert input to array if necessary
function arrayifyAssociation(assoc: any): any[] {
  if (!assoc) return [];
  if (typeof assoc.length === "number") return assoc;
  return [assoc];
}

function fetchDeepProp(base: any, propName: string): any[] {
  const flat = base[propName]; // RecipeInstruction format
  const nested = base[propName + "s"]; // RecipeInstructions.RecipeInstruction format

  const raw = nested ? nested[propName] : flat; // Result is either an object, array, or null

  return arrayifyAssociation(raw);
}

async function findFilesByRegex(
  dirPath: string,
  regex: RegExp,
): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subResults = await findFilesByRegex(fullPath, regex);
        results.push(...subResults);
      } else if (entry.isFile() && regex.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch (_e) {
    // Ignore errors reading directory
  }

  return results;
}

export async function fdxzImportJobHandler(
  job: Job,
  queueItem: JobQueueItem,
): Promise<void> {
  const timer = metrics.jobFinished.startTimer();
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  try {
    if (!queueItem.s3StorageKey) {
      throw new Error("No S3 storage key provided for FDXZ import");
    }

    await using downloaded = await downloadS3ToTemp(queueItem.s3StorageKey);

    let xmlPath: string;
    let extractPath: string | undefined;

    await using extractDir = await mkdtempDisposable("/tmp/");
    const tempExtractPath = extractDir.path;

    try {
      await extract(downloaded.filePath, { dir: tempExtractPath });

      // Was compressed, therefore was likely FDXZ
      xmlPath = path.join(tempExtractPath, "Data.xml");
      extractPath = tempExtractPath;
    } catch (e: any) {
      if (e.message === "end of central directory record signature not found") {
        // Was not compressed - likely just FDX instead of FDXZ
        xmlPath = downloaded.filePath;
        extractPath = undefined;
      } else {
        throw e;
      }
    }

    let xml = await readFile(xmlPath, "utf8");
    let data;

    try {
      data = JSON.parse(xmljs.xml2json(xml, { compact: true, spaces: 4 }));
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("invalid attribute name")) {
        xml = xml.replace(/<RecipeNutrition.*\/>/g, "");
        try {
          data = JSON.parse(xmljs.xml2json(xml, { compact: true, spaces: 4 }));
        } catch (_err2) {
          throw new ImportBadFormatError();
        }
      } else {
        throw new ImportBadFormatError();
      }
    }

    const fdxData = data.hixz || data.fdx || data.fdxz;
    if (!fdxData) {
      throw new ImportBadFormatError();
    }

    const cookbooks = fetchDeepProp(fdxData, "Cookbook");
    const cookbookNamesById: Record<string, string> = {};
    for (const cookbook of cookbooks) {
      const id = cookbook._attributes?.ID;
      const name = cookbook._attributes?.Name;
      if (id && name) {
        cookbookNamesById[id] = name;
      }
    }

    const recipes = fetchDeepProp(fdxData, "Recipe");

    const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

    for (const recipe of recipes) {
      const attrs = recipe._attributes || {};

      const ingredients = fetchDeepProp(recipe, "RecipeIngredient")
        .map((ing) => ing._attributes)
        .filter((ing) => ing)
        .map((ing) =>
          `${ing.Quantity || ""} ${ing.Unit || ""} ${ing.Ingredient || ""}`.trim(),
        )
        .join("\r\n");

      const instructions = fetchDeepProp(recipe, "RecipeProcedure")
        .map((proc) => proc.ProcedureText?._text)
        .filter((text) => text)
        .join("\r\n");

      const notes: string[] = [];
      // Add comments to notes
      if (attrs.Comments) notes.push(attrs.Comments);

      const authorNotes = fetchDeepProp(recipe, "RecipeAuthorNote")
        .map((note) => note._text)
        .filter((text) => text);

      const tips = fetchDeepProp(recipe, "RecipeTip")
        .map((tip) => tip._text)
        .filter((text) => text);

      // Add "author notes" to description or notes depending on length
      let description = "";
      if (authorNotes.length === 1 && authorNotes[0].length <= 150) {
        description = authorNotes[0];
      } else {
        notes.push(...authorNotes);
      }

      // Add recipeTips and join with double return
      notes.push(...tips);

      let totalTime = attrs.ReadyInTime || "";
      if (attrs.CookingTime) {
        totalTime = totalTime
          ? `${totalTime} (${attrs.CookingTime} cooking time)`
          : attrs.CookingTime;
      }

      const recipeTypes = (attrs.RecipeTypes || "")
        .split(",")
        .map((t: string) => t.trim())
        .filter((t: string) => t)
        .map((t: string) => cleanLabelTitle(t));

      const cookbookLabel = recipe.CookbookID
        ? cookbookNamesById[recipe.CookbookID]
        : undefined;

      const labels = [
        ...recipeTypes,
        ...(cookbookLabel ? [cleanLabelTitle(cookbookLabel)] : []),
        ...importLabels,
      ];

      const imageRefs = jobMeta.options?.excludeImages
        ? []
        : fetchDeepProp(recipe, "RecipeImage");

      const images: (Buffer | string)[] = [];

      for (const imageRef of imageRefs) {
        if (imageRef._text) {
          images.push(Buffer.from(imageRef._text, "base64"));
        } else if (imageRef._attributes?.FileName && extractPath) {
          const fileNameRegex = imageRef._attributes.FileName;
          try {
            const possibleImageFiles = await findFilesByRegex(
              extractPath,
              new RegExp(`(${fileNameRegex})$`, "i"),
            );
            if (possibleImageFiles.length > 0) {
              try {
                await stat(possibleImageFiles[0]);
                images.push(possibleImageFiles[0]);
              } catch (_e) {
                // Image file doesn't exist
              }
            }
          } catch (_e) {
            // Error finding image files
          }
        }
      }

      const canImportMultipleImages = await userHasCapability(
        job.userId,
        Capabilities.MultipleImages,
      );
      if (!canImportMultipleImages && images.length > 1) {
        images.splice(1); // Remove all but first image
      }

      standardizedRecipeImportInput.push({
        recipe: {
          title: attrs.Name || "Untitled",
          description,
          notes: notes.filter((n) => n).join("\r\n\r\n"),
          ingredients,
          instructions,
          totalTime: totalTime.trim(),
          activeTime: attrs.PreparationTime || "",
          yield: attrs.Servings ? `${attrs.Servings} servings` : "",
          source: attrs.Source || "",
          url: attrs.WebPage || "",
          folder: "main",
        },
        labels,
        images,
      });
    }

    await importJobFinishCommon({
      timer,
      job,
      userId: job.userId,
      standardizedRecipeImportInput,
      importTempDirectory: extractPath,
    });

    metrics.jobFinished.observe(
      {
        job_type: "import",
        import_type: "fdxz",
      },
      timer(),
    );
  } catch (error) {
    await importJobFailCommon({
      timer,
      job,
      error,
    });
  }
}
