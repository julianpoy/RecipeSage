/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Job } from "@prisma/client";
import { type JobMeta } from "@recipesage/prisma";
import type { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import {
  importJobFailCommon,
  importJobFinishCommon,
  metrics,
} from "@recipesage/util/server/general";
import {
  textToRecipe,
  TextToRecipeInputType,
} from "@recipesage/util/server/ml";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import { readFile } from "fs/promises";
import xmljs from "xml-js";
import type { JobQueueItem } from "./JobQueueItem";

export async function enexImportJobHandler(
  job: Job,
  queueItem: JobQueueItem,
): Promise<void> {
  const timer = metrics.jobFinished.startTimer();
  const jobMeta = job.meta as JobMeta;
  const importLabels = jobMeta.importLabels || [];

  try {
    if (!queueItem.s3StorageKey) {
      throw new Error("No S3 storage key provided for ENEX import");
    }

    await using downloaded = await downloadS3ToTemp(queueItem.s3StorageKey);

    const xml = await readFile(downloaded.filePath, "utf8");
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

    const grabImageBuffers = (field: any) => {
      if (!field) return [];
      if (field._text) return [Buffer.from(field._text, "base64")];
      if (field.data?._text) return [Buffer.from(field.data._text, "base64")];
      if (Array.isArray(field) && field.length)
        return field
          .map((item) => item._text || item.data?._text)
          .filter((item) => item)
          .map((item) => Buffer.from(item, "base64"));

      return [];
    };

    const recursiveGrabText = (field: any) => {
      let text = field?._text || "";

      if (typeof field === "object" && !Array.isArray(field)) {
        for (const key of Object.keys(field)) {
          if (!(key in field)) continue;
          const childText = recursiveGrabText(field[key]);
          text += `\n${childText}`;
        }
      }
      return text;
    };

    const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];
    // We want to support both single-note evernote files as well as multi-note
    const entries = Array.isArray(data["en-export"].note)
      ? data["en-export"].note
      : [data["en-export"].note];
    for (const enexRecipe of entries) {
      if (!enexRecipe.content._cdata) continue;

      let recipeText = "";
      const cdata = JSON.parse(
        xmljs.xml2json(enexRecipe.content._cdata, {
          compact: true,
          spaces: 4,
        }),
      );
      for (const element of cdata["en-note"].div) {
        recipeText += `\n${recursiveGrabText(element)}`;
      }
      recipeText = recipeText
        .split("\n")
        .filter((el) => el?.trim())
        .join("\n");
      const recipe = await textToRecipe(
        recipeText,
        TextToRecipeInputType.Document,
      );
      if (!recipe) {
        continue;
      }

      recipe.recipe.title = grabFieldText(enexRecipe.title);
      recipe.recipe.folder = "main";
      recipe.labels.push(...grabLabelTitles(enexRecipe.tag), ...importLabels);
      recipe.images.push(...grabImageBuffers(enexRecipe.resource));

      standardizedRecipeImportInput.push(recipe);
    }

    await importJobFinishCommon({
      timer,
      job,
      userId: job.userId,
      standardizedRecipeImportInput,
      importTempDirectory: undefined,
    });
  } catch (error) {
    await importJobFailCommon({
      timer,
      job,
      error,
    });
  }
}
