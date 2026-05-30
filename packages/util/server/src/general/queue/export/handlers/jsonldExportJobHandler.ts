import type { ExportJobSummary } from "@recipesage/prisma";
import { RecipeSummary } from "@recipesage/prisma";
import { PassThrough, Readable } from "stream";
import {
  ObjectTypes,
  writeStream,
  type StorageObjectRecord,
} from "../../../../storage";
import { JsonStreamStringify } from "json-stream-stringify";
import { recipeToJSONLD } from "../../../jsonLD";
import { transformRecipeImageUrlForSelfhost } from "../../../transformRecipeImageUrlForSelfhost";
import { pipeline } from "stream/promises";

async function* process(
  recipes: AsyncIterable<RecipeSummary>,
  onProgress: (processedCount: number) => void,
) {
  let processedCount = 0;
  for await (const recipe of recipes) {
    const recipeImages: typeof recipe.recipeImages = [];

    for (const recipeImage of recipe.recipeImages) {
      const location = await transformRecipeImageUrlForSelfhost(
        recipeImage.image.location,
      );
      recipeImages.push({
        ...recipeImage,
        image: {
          ...recipeImage.image,
          location,
        },
      });
    }

    const transformedRecipe = recipeToJSONLD({
      ...recipe,
      recipeImages,
    });

    yield transformedRecipe;

    processedCount++;
    onProgress(processedCount);
  }
}

export async function jsonldExportJobHandler(
  job: ExportJobSummary,
  recipes: AsyncIterable<RecipeSummary>,
  onProgress: (processedCount: number) => void,
): Promise<StorageObjectRecord> {
  const outputStream = new PassThrough();
  const uploadResult = writeStream(
    ObjectTypes.DATA_EXPORT,
    outputStream,
    "application/ld+json",
  );

  const passthrough = new PassThrough({
    objectMode: true,
  });
  const jsonStream = new JsonStreamStringify({
    recipes: passthrough,
  });

  await Promise.all([
    pipeline(Readable.from(process(recipes, onProgress)), passthrough),
    pipeline(jsonStream, outputStream),
  ]);

  return await uploadResult;
}
