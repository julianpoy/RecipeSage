import type { ImportJobSummary } from "@recipesage/prisma";

import {
  MAX_IMAGES,
  type StandardizedRecipeImportEntry,
} from "../../../../db/index";
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
  buildUnstructuredRecipeEntry,
  getUnformattedImportLabel,
} from "./shared/unstructuredRecipeEntry";
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
import * as Sentry from "@sentry/node";

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
      if (imagePaths.length >= MAX_IMAGES) continue;
      const imagePath = path.join(tempDir, randomUUID());
      await writeFile(imagePath, Buffer.from(base64, "base64"));
      imagePaths.push(imagePath);
    }
  }
  return { pdfPaths, imagePaths };
};

interface ProcessedNote {
  entry: StandardizedRecipeImportEntry;
  failedToStructure: boolean;
}

const processNote = async (args: {
  noteXml: string;
  importLabels: string[];
  unformattedLabel: string;
  tempDir: string;
  jobId: string;
}): Promise<ProcessedNote | undefined> => {
  const { noteXml, importLabels, unformattedLabel, tempDir, jobId } = args;

  const parsedNote = xmljs.xml2js(noteXml, { compact: false }) as XmlElement;
  const note = findChild(parsedNote, "note");
  if (!note) return;

  const cdataText = elementText(findChild(note, "content"));
  let recipeText = "";
  if (cdataText) {
    const parsedCdata = xmljs.xml2js(cdataText, {
      compact: false,
    }) as XmlElement;
    const enNote = findChild(parsedCdata, "en-note");
    recipeText = normalizeRecipeText(extractText(enNote));
  }

  const { pdfPaths, imagePaths } = await stageResources(note, tempDir);

  const titleText = elementText(findChild(note, "title")).trim();
  if (!titleText && !recipeText && !pdfPaths.length && !imagePaths.length) {
    return;
  }

  let recipe: StandardizedRecipeImportEntry | undefined;
  try {
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
  } catch (e) {
    Sentry.captureException(e, {
      extra: {
        jobId,
      },
    });
  }

  const failedToStructure = !recipe;
  if (!recipe) {
    recipe = buildUnstructuredRecipeEntry({
      title: "",
      notes: recipeText,
      labels: [],
      images: [],
    });
  }

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
  if (failedToStructure) recipe.labels.push(unformattedLabel);

  recipe.images.push(...imagePaths);

  return { entry: recipe, failedToStructure };
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

  const unformattedLabel = await getUnformattedImportLabel(jobMeta.language);

  let processedCount = 0;
  let partialCount = 0;
  let failedCount = 0;
  let batch: string[] = [];

  const flushBatch = async () => {
    if (!batch.length) return;
    const results = await Promise.all(
      batch.map(async (noteXml) => {
        try {
          return await processNote({
            noteXml,
            importLabels,
            unformattedLabel,
            tempDir: tempDir.path,
            jobId: job.id,
          });
        } catch (e) {
          Sentry.captureException(e, {
            extra: {
              jobId: job.id,
            },
          });
          failedCount++;
          return undefined;
        }
      }),
    );
    for (const result of results) {
      if (!result) continue;
      standardizedRecipeImportInput.push(result.entry);
      if (result.failedToStructure) partialCount++;
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

  for await (const noteXml of streamNoteChunks(
    downloaded.filePath,
    () => failedCount++,
  )) {
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
    partialCount,
    failedCount,
  });
}
