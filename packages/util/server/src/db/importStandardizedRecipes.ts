import { prisma } from "@recipesage/prisma";
import { Prisma } from "@prisma/client";
import pLimit from "p-limit";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { userHasCapability } from "../capabilities";
import { Capabilities } from "@recipesage/util/shared";
import {
  writeImageBuffer,
  writeImageFile,
  writeImageURL,
  ObjectTypes,
} from "../storage";

export interface StandardizedRecipeImportEntry {
  recipe: {
    title: string;
    description?: string;
    yield?: string;
    activeTime?: string;
    totalTime?: string;
    source?: string;
    url?: string;
    notes?: string;
    ingredients?: string;
    instructions?: string;
    folder?: string;
    rating?: number;
  };
  labels: string[];
  images: (string | Buffer)[];
}

const IMPORT_TRANSACTION_TIMEOUT_MS = 120000;
const CONCURRENT_IMAGE_IMPORTS = 2;
const MAX_IMAGES = 10;
const MAX_IMPORT_LIMIT = 10000; // A reasonable cutoff to make sure we don't kill the server for extremely large imports

/**
 * Centralized place for all recipe import tasks as a standardized format.
 * importTempDirectory is required if reading paths from disk, and represents a bounded parent directory that can be read from. Any access outside of this path will result in an error.
 */
export const importStandardizedRecipes = async (
  userId: string,
  entries: StandardizedRecipeImportEntry[],
  importTempDirectory?: string,
) => {
  const highResConversion = await userHasCapability(
    userId,
    Capabilities.HighResImages,
  );

  const canUploadMultipleImages = await userHasCapability(
    userId,
    Capabilities.MultipleImages,
  );

  if (entries.length > MAX_IMPORT_LIMIT) {
    throw new Error("Too many recipes to import in one batch");
  }

  const limit = pLimit(CONCURRENT_IMAGE_IMPORTS);
  const imagesByRecipeIdx = await Promise.all(
    entries.map(async (entry) => {
      if (!entry.images) return [];

      return await Promise.all(
        entry.images
          .filter((_, idx) => idx === 0 || canUploadMultipleImages)
          .filter((_, idx) => idx < MAX_IMAGES)
          .map((image) =>
            limit(async () => {
              if (typeof image === "object") {
                return await writeImageBuffer(
                  ObjectTypes.RECIPE_IMAGE,
                  image,
                  highResConversion,
                );
              } else if (
                image.startsWith("http:") ||
                image.startsWith("https:")
              ) {
                try {
                  return await writeImageURL(
                    ObjectTypes.RECIPE_IMAGE,
                    image,
                    highResConversion,
                  );
                } catch (e) {
                  console.error(e);
                }
              } else if (
                importTempDirectory // We require the temporary directory path for security
              ) {
                try {
                  return await writeImageFile(
                    ObjectTypes.RECIPE_IMAGE,
                    image,
                    highResConversion,
                    importTempDirectory,
                  );
                } catch (e) {
                  console.error(e);
                }
              }
            }),
          ),
      );
    }),
  );

  return prisma.$transaction(
    async (tx) => {
      const recipes = await tx.recipe.createManyAndReturn({
        data: entries.map((entry) => ({
          title: entry.recipe.title,
          description: entry.recipe.description || "",
          yield: entry.recipe.yield || "",
          activeTime: entry.recipe.activeTime || "",
          totalTime: entry.recipe.totalTime || "",
          source: entry.recipe.source || "",
          url: entry.recipe.url || "",
          notes: entry.recipe.notes || "",
          ingredients: entry.recipe.ingredients || "",
          instructions: entry.recipe.instructions || "",
          rating: entry.recipe.rating,
          folder: ["inbox", "main"].includes(entry.recipe.folder || "")
            ? entry.recipe.folder || ""
            : "main",
          userId,
        })),
      });

      const recipeIdsByLabelTitle: Record<string, string[]> = {};

      entries.forEach((entry, idx) => {
        const recipe = recipes[idx];
        entry.labels.map((labelTitle) => {
          labelTitle = cleanLabelTitle(labelTitle);
          recipeIdsByLabelTitle[labelTitle] =
            recipeIdsByLabelTitle[labelTitle] || [];
          recipeIdsByLabelTitle[labelTitle].push(recipe.id);
        });
      });

      for (const labelTitle of Object.keys(recipeIdsByLabelTitle)) {
        const label = await tx.label.upsert({
          where: {
            userId_title: {
              userId,
              title: labelTitle,
            },
          },
          create: {
            userId,
            title: labelTitle,
          },
          update: {},
        });

        await tx.recipeLabel.createMany({
          data: recipeIdsByLabelTitle[labelTitle].map((recipeId) => {
            return {
              labelId: label.id,
              recipeId,
            };
          }),
          skipDuplicates: true,
        });
      }

      const pendingImages = imagesByRecipeIdx
        .map((images, recipeIdx) =>
          images
            .filter((image) => !!image)
            .map((image, imageIdx) => ({
              image,
              recipeId: recipes[recipeIdx].id,
              order: imageIdx,
            })),
        )
        .flat()
        .filter((e) => e);

      const savedImages = await tx.image.createManyAndReturn({
        data: pendingImages.map((p) => ({
          userId,
          location: p.image.location,
          key: p.image.key,
          json: p.image as unknown as Prisma.JsonObject,
        })),
      });

      await tx.recipeImage.createMany({
        data: pendingImages.map((p, idx) => ({
          recipeId: p.recipeId,
          imageId: savedImages[idx].id,
          order: p.order,
        })),
      });

      return recipes.map((recipe) => recipe.id);
    },
    {
      timeout: IMPORT_TRANSACTION_TIMEOUT_MS,
    },
  );
};
