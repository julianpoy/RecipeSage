import { prisma, RecipeSummary, recipeSummary } from "@recipesage/prisma";
import { recipeToJSONLD } from "./jsonLD";
import { ObjectTypes, writeStream } from "../storage";
import { once, PassThrough } from "stream";
import dedent from "ts-dedent";
import ZipStream from "zip-stream";
import _ZipStream from "zip-stream";
import { JsonStreamStringify } from "json-stream-stringify";
import { recipeAsyncIteratorToPDF } from "./recipeSummariesToPDF";
import { Prisma } from "@prisma/client";
import { transformRecipeImageUrlForSelfhost } from "./transformRecipeImageUrlForSelfhost";

export type SupportedExportFormat = "txt" | "pdf" | "jsonld";

export const exportDataAsync = async (opts: {
  format: SupportedExportFormat;
  where: Prisma.RecipeWhereInput;
  onProgress: (processed: number, totalCount: number) => void;
}) => {
  const outputStream = new PassThrough();
  const mimetype = getMimetypeForExportFormat(opts.format);

  const count = await prisma.recipe.count({
    where: opts.where,
  });

  const recipes = prisma.recipe.cursorStream(
    {
      where: opts.where,
      ...recipeSummary,
      orderBy: {
        title: "asc",
      },
    },
    {
      batchSize: 100,
      prefill: 200,
    },
  ) as unknown as AsyncIterable<RecipeSummary>;

  const uploadResult = writeStream(
    ObjectTypes.DATA_EXPORT,
    outputStream,
    mimetype,
  );

  let processedCount = 0;
  const onRecipeProcessed = () => {
    processedCount++;

    opts.onProgress(processedCount, count);
  };

  let processingResult: Promise<unknown> = Promise.resolve();
  switch (opts.format) {
    case "txt": {
      processingResult = recipeSummariesToTextStream(
        recipes,
        outputStream,
        onRecipeProcessed,
      );
      break;
    }
    case "pdf": {
      processingResult = recipeSummariesToPDFZipStream(
        recipes,
        outputStream,
        onRecipeProcessed,
      );
      break;
    }
    case "jsonld": {
      processingResult = recipeSummariesToJSONLDStream(
        recipes,
        outputStream,
        onRecipeProcessed,
      );
      break;
    }
  }

  await processingResult;
  const s3Record = await uploadResult;

  return s3Record;
};

const getMimetypeForExportFormat = (format: SupportedExportFormat) => {
  switch (format) {
    case "txt": {
      return "text/plain";
    }
    case "pdf": {
      return "application/zip";
    }
    case "jsonld": {
      return "application/ld+json";
    }
  }
};

async function* recipesToJSONLD(recipes: AsyncIterable<RecipeSummary>) {
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
  }
}

const recipeSummariesToJSONLDStream = async (
  recipes: AsyncIterable<RecipeSummary>,
  outputStream: PassThrough,
  onRecipeProcessed: () => void,
): Promise<unknown> => {
  const passthrough = new PassThrough({
    objectMode: true,
  });
  const jsonStream = new JsonStreamStringify({
    recipes: passthrough,
  });

  jsonStream.on("error", () => {
    console.error(jsonStream.errored);
    throw (
      jsonStream.errored ||
      new Error("Error while processing JSONStream export")
    );
  });
  jsonStream.pipe(outputStream);
  const endP = once(jsonStream, "end");

  for await (const jsonLDRecipe of recipesToJSONLD(recipes)) {
    await write(passthrough, jsonLDRecipe);

    onRecipeProcessed();
  }

  await end(passthrough);

  return endP;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function write(stream: PassThrough, chunk: any, encoding?: BufferEncoding) {
  const res = encoding ? stream.write(chunk, encoding) : stream.write(chunk);
  if (!res) {
    return once(stream, "drain");
  }
}

function end(stream: PassThrough) {
  return new Promise<void>((resolve) => {
    stream.end(resolve);
  });
}

const recipeSummariesToTextStream = async (
  recipeStream: AsyncIterable<RecipeSummary>,
  outputStream: PassThrough,
  onRecipeProcessed: () => void,
) => {
  const writeResult = write(outputStream, "==== Recipes ====\n\n", "utf8");
  if (writeResult) await writeResult;

  for await (const recipe of recipeStream) {
    const images: string[] = [];

    for (const recipeImage of recipe.recipeImages) {
      const image = await transformRecipeImageUrlForSelfhost(
        recipeImage.image.location,
      );
      images.push(image);
    }

    const recipeStr = dedent`
      Title: ${recipe.title}
      Description: ${recipe.description}
      Yield: ${recipe.yield}
      ActiveTime: ${recipe.activeTime}
      TotalTime: ${recipe.totalTime}
      Source: ${recipe.source}
      Url: ${recipe.url}
      Folder: ${recipe.folder}
      Ingredients: ${recipe.ingredients}
      Instructions: ${recipe.instructions}
      Notes: ${recipe.notes}
      CreatedAt: ${recipe.createdAt}
      UpdatedAt: ${recipe.updatedAt}
      Rating: ${recipe.rating}
      Labels: ${recipe.recipeLabels.map((recipeLabel) => recipeLabel.label.title).join(", ")}
      Images: ${images.join(" ")}
      \r\n
    `;

    await write(outputStream, recipeStr, "utf-8");

    onRecipeProcessed();
  }

  await end(outputStream);
};

const recipeSummariesToPDFZipStream = async (
  recipeStream: AsyncIterable<RecipeSummary>,
  outputStream: PassThrough,
  onRecipeProcessed: () => void,
): Promise<unknown> => {
  const zipStream = new (ZipStream as unknown as typeof _ZipStream)({
    zlib: {
      level: 0,
    },
  });
  zipStream.pipe(outputStream);

  zipStream.on("error", function (err) {
    console.error(err);
    throw err;
  });

  const endP = once(zipStream, "end");

  for await (const result of recipeAsyncIteratorToPDF(recipeStream)) {
    await new Promise<void>((resolve, reject) => {
      zipStream.entry(
        result.pdf,
        {
          name: `${result.recipe.title}-${result.recipe.id.substring(0, 5)}.pdf`,
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    onRecipeProcessed();
  }

  zipStream.finalize();

  return endP;
};
