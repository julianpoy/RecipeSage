import type { ImportJobSummary } from "@recipesage/prisma";

import type { StandardizedRecipeImportEntry } from "../../../../db/index";
import { importJobFinishCommon } from "../../../index";
import {
  OCR_MIN_VALID_TEXT,
  ocrImagesToRecipe,
  pdfToRecipe,
  textToRecipe,
  TextToRecipeInputType,
} from "../../../../ml/index";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { downloadS3ToTemp } from "./shared/s3Download";
import {
  countNoteChunks,
  elementText,
  extractText,
  findChild,
  findChildren,
  IMAGE_MIME_TYPES,
  normalizeRecipeText,
  PDF_MIME_TYPE,
  streamNoteChunks,
  type XmlElement,
} from "./shared/enexParsing";
import xmljs from "xml-js";
import { mkdtempDisposable, writeFile } from "fs/promises";
import { createReadStream } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import type { StandardJobQueueItem } from "../../JobQueueItem";
import { debounceJobUpdateProgress } from "../../../jobs/updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../processImportJob";
import { ImportTooManyRecipesError } from "../../../jobs/jobErrors";

const CONCURRENT_NOTE_PROCESSING = 4;
const MAX_COUNT_LIMIT = 500;
const MAX_OCR_IMAGES = 3;

interface StagedResources {
  pdfPaths: string[];
  imagePaths: string[];
}

const stageResources = async (
  note: XmlElement,
  tempDir: string,
): Promise<StagedResources> => {
  const pdfPaths: string[] = [];
  const imagePaths: string[] = [];
  for (const resource of findChildren(note, "resource")) {
    const base64 = elementText(findChild(resource, "data"));
    if (!base64) continue;
    const mime = elementText(findChild(resource, "mime")).trim().toLowerCase();
    if (mime === PDF_MIME_TYPE) {
      if (pdfPaths.length >= 1) continue;
      const pdfPath = path.join(tempDir, randomUUID());
      await writeFile(pdfPath, Buffer.from(base64, "base64"));
      pdfPaths.push(pdfPath);
    } else if (IMAGE_MIME_TYPES.has(mime)) {
      const imagePath = path.join(tempDir, randomUUID());
      await writeFile(imagePath, Buffer.from(base64, "base64"));
      imagePaths.push(imagePath);
    }
  }
  return { pdfPaths, imagePaths };
};

const processNote = async (
  noteXml: string,
  importLabels: string[],
  tempDir: string,
): Promise<StandardizedRecipeImportEntry | undefined> => {
  const parsedNote = JSON.parse(
    xmljs.xml2json(noteXml, { compact: false }),
  ) as XmlElement;
  const note = findChild(parsedNote, "note");
  if (!note) return;

  const cdataText = elementText(findChild(note, "content"));
  let recipeText = "";
  if (cdataText) {
    const parsedCdata = JSON.parse(
      xmljs.xml2json(cdataText, { compact: false }),
    ) as XmlElement;
    const enNote = findChild(parsedCdata, "en-note");
    recipeText = normalizeRecipeText(extractText(enNote));
  }

  const { pdfPaths, imagePaths } = await stageResources(note, tempDir);

  let recipe: StandardizedRecipeImportEntry | undefined;
  if (recipeText.length > OCR_MIN_VALID_TEXT) {
    recipe = await textToRecipe(recipeText, TextToRecipeInputType.Document);
  } else if (pdfPaths.length > 0) {
    recipe = await pdfToRecipe(pdfPaths[0]);
  } else if (imagePaths.length > 0) {
    const streams = imagePaths
      .slice(0, MAX_OCR_IMAGES)
      .map((imagePath) => createReadStream(imagePath));
    recipe = await ocrImagesToRecipe(streams);
  }

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

  recipe.images.push(...imagePaths);

  return recipe;
};

export async function enexImportJobHandler(
  job: ImportJobSummary,
  queueItem: StandardJobQueueItem,
): Promise<void> {
  const jobMeta = job.meta;
  const importLabels = jobMeta.importLabels || [];

  if (!queueItem.storageKey) {
    throw new Error("No S3 storage key provided for ENEX import");
  }

  await using downloaded = await downloadS3ToTemp(queueItem.storageKey);
  await using tempDir = await mkdtempDisposable("/tmp/");

  const totalCount = await countNoteChunks(downloaded.filePath);
  if (totalCount > MAX_COUNT_LIMIT) {
    throw new ImportTooManyRecipesError();
  }

  const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

  const onProgress = debounceJobUpdateProgress({
    jobId: job.id,
    userId: job.userId,
  });

  let processedCount = 0;
  let batch: string[] = [];

  const flushBatch = async () => {
    if (!batch.length) return;
    const recipes = await Promise.all(
      batch.map((noteXml) => processNote(noteXml, importLabels, tempDir.path)),
    );
    for (const recipe of recipes) {
      if (recipe) standardizedRecipeImportInput.push(recipe);
    }
    processedCount += batch.length;
    onProgress({
      processedCount,
      totalCount,
      step: 1,
      totalStepCount: IMPORT_JOB_STEP_COUNT,
    });
    batch = [];
  };

  for await (const noteXml of streamNoteChunks(downloaded.filePath)) {
    batch.push(noteXml);
    if (batch.length >= CONCURRENT_NOTE_PROCESSING) {
      await flushBatch();
    }
  }
  await flushBatch();

  await importJobFinishCommon({
    job,
    userId: job.userId,
    standardizedRecipeImportInput,
    importTempDirectory: tempDir.path,
  });
}
