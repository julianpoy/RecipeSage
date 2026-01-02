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
import { readdir, mkdtempDisposable, stat } from "fs/promises";
import extract from "extract-zip";
import path from "path";
import { spawn } from "child_process";
import type { JobQueueItem } from "./JobQueueItem";

interface TableMap {
  t_recipe?: any[];
  t_recipeingredient?: any[];
  t_recipeprocedure?: any[];
  t_recipetip?: any[];
  t_authornote?: any[];
  t_image?: any[];
  t_recipeimage?: any[];
  t_cookbook?: any[];
  t_technique?: any[];
  t_recipetechnique?: any[];
}

async function parseMdbTable(
  mdbPath: string,
  tableName: string,
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const process = spawn("mdb-json", [mdbPath, tableName]);
    let output = "";
    let _errorOutput = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      _errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        try {
          const lines = output
            .trim()
            .split("\n")
            .filter((line) => line);
          const rows = lines.map((line) => JSON.parse(line));
          resolve(rows);
        } catch (_e) {
          resolve([]);
        }
      } else {
        resolve([]);
      }
    });

    process.on("error", (err) => {
      reject(err);
    });
  });
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

export async function lcbImportJobHandler(
  job: Job,
  queueItem: JobQueueItem,
): Promise<void> {
  const timer = metrics.jobFinished.startTimer();
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  try {
    if (!queueItem.s3StorageKey) {
      throw new Error("No S3 storage key provided for LCB import");
    }

    await using downloaded = await downloadS3ToTemp(queueItem.s3StorageKey);
    await using extractDir = await mkdtempDisposable("/tmp/");
    const extractPath = extractDir.path;

    await extract(downloaded.filePath, { dir: extractPath });

    const mdbFiles = await findFilesByRegex(extractPath, /\.mdb$/i);
    if (mdbFiles.length === 0) {
      throw new ImportBadFormatError("No .mdb file found in LCB archive");
    }
    const mdbPath = mdbFiles[0];

    const tablesNeeded = [
      "t_cookbook",
      // "t_cookbookchapter",
      // "t_cookbookchapterassocation",
      // "t_attachment", //2x unused
      "t_authornote", // seems to be a cross between description (short) and notes (long) - sometimes very long (multiple entries per recipe, divided paragraph)
      // "t_cookbook_x", // unused from this db afaik
      // "t_favorite_x", //2x unused
      // "t_favoritefolder", //2x unused
      // "t_glossaryitem",
      // "t_groceryaisle",
      // "t_grocerylistitemrecipe",
      "t_image", // Holds filenames for all images
      // "t_ingredient",
      // "t_ingredientattachment",
      // "t_ingredientautocomplete",
      // "t_ingredientfolder",
      // "t_ingredientfolder_x",
      // "t_ingredientimage",
      // "t_meal", // Holds meal names with an abbreviation. No reference to any other table
      // "t_measure",
      // "t_measure_x",
      // "t_menu", // Holds menu info - has some "types" info that might be useful for labelling
      // "t_menu_x", // unused
      // "t_menuimage",
      "t_recipe",
      // "t_recipe_x", //2x unused
      // "t_recipeattachment", // 2x unused
      "t_recipeimage", // bidirectional relation table between recipe and image
      "t_recipeingredient",
      // "t_recipemeasure",
      "t_recipeprocedure",
      // "t_recipereview",
      "t_technique",
      "t_recipetechnique",
      "t_recipetip",
      // "t_recipetype", // seems to store category names, but no discernable relationship to recipe table - better to use recipetypes field in recipe itself (comma separated)
      // "t_recipetype_x", //2x unused
      // "t_grocerylistitem",
      // "t_ingredient_x", //2x unused
      // "t_ingredientmeasure", //not entirely clear - looks like a relationship table between ingredients and measurements
      // "t_recipemedia" //2x unused (or barely used)
    ];

    const tableMap: TableMap = {};
    for (const tableName of tablesNeeded) {
      tableMap[tableName as keyof TableMap] = await parseMdbTable(
        mdbPath,
        tableName,
      );
    }

    tableMap.t_recipe = (tableMap.t_recipe || []).filter(
      (recipe) =>
        !!recipe.recipeid &&
        (jobMeta.options?.includeStockRecipes || !!recipe.modifieddate),
    );

    const cookbookNamesById: Record<string, string> = {};
    for (const cookbook of tableMap.t_cookbook || []) {
      if (cookbook.cookbookid && cookbook.name) {
        cookbookNamesById[cookbook.cookbookid] = cookbook.name;
      }
    }

    const ingredientsByRecipeId: Record<string, any[]> = {};
    for (const ing of tableMap.t_recipeingredient || []) {
      if (!ingredientsByRecipeId[ing.recipeid]) {
        ingredientsByRecipeId[ing.recipeid] = [];
      }
      ingredientsByRecipeId[ing.recipeid].push(ing);
    }
    for (const recipeId in ingredientsByRecipeId) {
      ingredientsByRecipeId[recipeId].sort(
        (a, b) =>
          parseInt(a.ingredientindex || "0", 10) -
          parseInt(b.ingredientindex || "0", 10),
      );
    }

    const proceduresByRecipeId: Record<string, any[]> = {};
    for (const proc of tableMap.t_recipeprocedure || []) {
      if (!proceduresByRecipeId[proc.recipeid]) {
        proceduresByRecipeId[proc.recipeid] = [];
      }
      proceduresByRecipeId[proc.recipeid].push(proc);
    }
    for (const recipeId in proceduresByRecipeId) {
      proceduresByRecipeId[recipeId].sort(
        (a, b) =>
          parseInt(a.procedureindex || "0", 10) -
          parseInt(b.procedureindex || "0", 10),
      );
    }

    const tipsByRecipeId: Record<string, any[]> = {};
    for (const tip of tableMap.t_recipetip || []) {
      if (!tipsByRecipeId[tip.recipeid]) {
        tipsByRecipeId[tip.recipeid] = [];
      }
      tipsByRecipeId[tip.recipeid].push(tip);
    }
    for (const recipeId in tipsByRecipeId) {
      tipsByRecipeId[recipeId].sort(
        (a, b) =>
          parseInt(a.tipindex || "0", 10) - parseInt(b.tipindex || "0", 10),
      );
    }

    const authorNotesByRecipeId: Record<string, any[]> = {};
    for (const note of tableMap.t_authornote || []) {
      if (!authorNotesByRecipeId[note.recipeid]) {
        authorNotesByRecipeId[note.recipeid] = [];
      }
      authorNotesByRecipeId[note.recipeid].push(note);
    }
    for (const recipeId in authorNotesByRecipeId) {
      authorNotesByRecipeId[recipeId].sort(
        (a, b) =>
          parseInt(a.authornoteindex || "0", 10) -
          parseInt(b.authornoteindex || "0", 10),
      );
    }

    const imagesById: Record<string, any> = {};
    for (const img of tableMap.t_image || []) {
      if (img.imageid) {
        imagesById[img.imageid] = img;
      }
    }

    const imagesByRecipeId: Record<string, any[]> = {};
    for (const recipeImage of tableMap.t_recipeimage || []) {
      if (!imagesByRecipeId[recipeImage.recipeid]) {
        imagesByRecipeId[recipeImage.recipeid] = [];
      }
      const imageData = imagesById[recipeImage.imageid];
      if (imageData) {
        imagesByRecipeId[recipeImage.recipeid].push({
          filename: imageData.filename,
          imageindex: recipeImage.imageindex,
        });
      }
    }

    const techniquesById: Record<string, any> = {};
    for (const tech of tableMap.t_technique || []) {
      if (tech.techniqueid) {
        techniquesById[tech.techniqueid] = tech;
      }
    }

    const techniquesByRecipeId: Record<string, any[]> = {};
    for (const recipeTech of tableMap.t_recipetechnique || []) {
      if (!techniquesByRecipeId[recipeTech.recipeid]) {
        techniquesByRecipeId[recipeTech.recipeid] = [];
      }
      const techData = techniquesById[recipeTech.techniqueid];
      if (techData) {
        techniquesByRecipeId[recipeTech.recipeid].push(techData);
      }
    }

    const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

    for (const lcbRecipe of tableMap.t_recipe || []) {
      const ingredients = (ingredientsByRecipeId[lcbRecipe.recipeid] || [])
        .map((ing) =>
          `${ing.quantitytext || ""} ${ing.unittext || ""} ${ing.ingredienttext || ""}`.trim(),
        )
        .join("\r\n");

      const instructions = (proceduresByRecipeId[lcbRecipe.recipeid] || [])
        .map((proc) => proc.proceduretext)
        .filter((text) => text)
        .join("\r\n");

      const notes: string[] = [];
      // Add comments to notes
      if (lcbRecipe.comments) notes.push(lcbRecipe.comments);

      const authorNotes = (authorNotesByRecipeId[lcbRecipe.recipeid] || [])
        .map((note) => note.authornotetext)
        .filter((text) => text);

      const tips = (tipsByRecipeId[lcbRecipe.recipeid] || [])
        .map((tip) => tip.tiptext)
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

      if (jobMeta.options?.includeTechniques) {
        const techniques = (techniquesByRecipeId[lcbRecipe.recipeid] || [])
          .map((tech) => {
            const name = tech.name || "";
            const comments = tech.comments || "";
            return comments ? `${name}:\r\n${comments}` : name;
          })
          .filter((text) => text);
        notes.push(...techniques);
      }

      let totalTime = lcbRecipe.readyintime || "";
      if (lcbRecipe.cookingtime) {
        totalTime = totalTime
          ? `${totalTime} (${lcbRecipe.cookingtime} cooking time)`
          : lcbRecipe.cookingtime;
      }

      const recipeTypes = (lcbRecipe.recipetypes || "")
        .split(",")
        .map((t: string) => t.trim())
        .filter((t: string) => t)
        .map((t: string) => cleanLabelTitle(t));

      const cookbookLabel = lcbRecipe.cookbookid
        ? cookbookNamesById[lcbRecipe.cookbookid]
        : undefined;

      const labels = [
        ...recipeTypes,
        ...(cookbookLabel ? [cleanLabelTitle(cookbookLabel)] : []),
        ...importLabels,
      ];

      const images: string[] = [];
      if (!jobMeta.options?.excludeImages) {
        const imageData = (imagesByRecipeId[lcbRecipe.recipeid] || []).sort(
          (a, b) => (a.imageindex || 0) - (b.imageindex || 0),
        );

        for (const img of imageData) {
          if (img.filename) {
            try {
              const possibleImageFiles = await findFilesByRegex(
                extractPath,
                new RegExp(`(${img.filename})$`, "i"),
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
          images.splice(1);
        }
      }

      standardizedRecipeImportInput.push({
        recipe: {
          title: lcbRecipe.recipename || "Untitled",
          description,
          notes: notes.filter((n) => n).join("\r\n\r\n"),
          ingredients,
          instructions,
          totalTime: totalTime.toString().trim(),
          activeTime: lcbRecipe.preparationtime?.toString() || "",
          yield: lcbRecipe.yield?.toString() || "",
          source: lcbRecipe.source || "",
          url: lcbRecipe.webpage || "",
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
        import_type: "lcb",
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
