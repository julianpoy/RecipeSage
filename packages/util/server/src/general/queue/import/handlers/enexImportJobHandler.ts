import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import { textToRecipe, TextToRecipeInputType } from "../../../../ml/index";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import {
  countNoteChunks,
  elementText,
  extractText,
  findChild,
  findChildren,
  normalizeRecipeText,
  streamNoteChunks,
  type XmlElement,
} from "./shared/enexParsing";
import xmljs from "xml-js";
import { mkdtempDisposable, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import type { JobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";

const processNote = async (
  noteXml: string,
  importLabels: string[],
  imageDir: string,
): Promise<StandardizedRecipeImportEntry | undefined> => {
  const parsedNote = JSON.parse(
    xmljs.xml2json(noteXml, { compact: false }),
  ) as XmlElement;
  const note = findChild(parsedNote, "note");
  if (!note) return;

  const cdataText = elementText(findChild(note, "content"));
  if (!cdataText) return;

  const parsedCdata = JSON.parse(
    xmljs.xml2json(cdataText, { compact: false }),
  ) as XmlElement;
  const enNote = findChild(parsedCdata, "en-note");

  const recipeText = normalizeRecipeText(extractText(enNote));
  if (!recipeText.length) return;

  const recipe = await textToRecipe(recipeText, TextToRecipeInputType.Document);
  if (!recipe) return;

  const titleText = elementText(findChild(note, "title")).trim();
  if (titleText) recipe.recipe.title = titleText;

  const noteAttributes = findChild(note, "note-attributes");
  if (noteAttributes) {
    const sourceUrl = elementText(
      findChild(noteAttributes, "source-url"),
    ).trim();
    if (sourceUrl) recipe.recipe.url = sourceUrl;
    const author = elementText(findChild(noteAttributes, "author")).trim();
    if (author && !recipe.recipe.source) recipe.recipe.source = author;
  }

  const labels = findChildren(note, "tag")
    .map((t) => cleanLabelTitle(elementText(t)))
    .filter((l) => l.length);
  recipe.labels.push(...labels, ...importLabels);

  for (const resource of findChildren(note, "resource")) {
    const base64 = elementText(findChild(resource, "data"));
    if (!base64) continue;
    const imagePath = path.join(imageDir, randomUUID());
    await writeFile(imagePath, Buffer.from(base64, "base64"));
    recipe.images.push(imagePath);
  }

  return recipe;
};

export async function enexImportJobHandler(
  job: ImportJobSummary,
  queueItem: JobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for ENEX import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  await using imageDir = await mkdtempDisposable("/tmp/");

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  const totalCount = await countNoteChunks(downloaded.filePath);
  let processedCount = 0;

  for await (const noteXml of streamNoteChunks(downloaded.filePath)) {
    const recipe = await processNote(noteXml, importLabels, imageDir.path);
    if (recipe) standardizedRecipeImportInput.push(recipe);

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
    importTempDirectory: imageDir.path,
  });
}
