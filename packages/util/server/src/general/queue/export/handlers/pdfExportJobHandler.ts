import type { ExportJobSummary } from "@recipesage/prisma";
import { RecipeSummary } from "@recipesage/prisma";
import { PassThrough } from "stream";
import {
  ObjectTypes,
  writeStream,
  type StorageObjectRecord,
} from "../../../../storage";
import ZipStream from "zip-stream";
import {
  getRecipePDFStrings,
  recipeAsyncIteratorToPDF,
} from "../../../recipeSummariesToPDF";
import { pipeline } from "stream/promises";

export async function pdfExportJobHandler(
  job: ExportJobSummary,
  recipes: AsyncIterable<RecipeSummary>,
  onProgress: (processedCount: number) => void,
): Promise<StorageObjectRecord> {
  const outputStream = new PassThrough();
  const uploadResultP = writeStream(
    ObjectTypes.DATA_EXPORT,
    outputStream,
    "application/zip",
  );

  const zipStream = new ZipStream({
    zlib: {
      level: 0,
    },
  });

  const pipelineP = pipeline(zipStream, outputStream);

  const strings = await getRecipePDFStrings(job.meta.language ?? "en-us");

  let processedCount = 0;
  for await (const result of recipeAsyncIteratorToPDF(recipes, {
    strings,
    includeImageUrls: true,
  })) {
    await new Promise<void>((resolve, reject) => {
      zipStream.entry(
        result.stream,
        {
          name: `${result.recipe.title.replaceAll(/[/\\]/g, "")}-${result.recipe.id.substring(0, 5)}.pdf`,
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    processedCount++;
    onProgress(processedCount);
  }

  zipStream.finalize();

  const [uploadResult] = await Promise.all([uploadResultP, pipelineP]);

  return uploadResult;
}
