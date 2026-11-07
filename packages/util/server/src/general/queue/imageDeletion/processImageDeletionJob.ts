import { prisma } from "@recipesage/prisma";
import { deleteObjects, ObjectTypes } from "../../../storage";
import type { ImageDeletionJobQueueItem } from "./ImageDeletionJobQueueItem";

const IMAGE_DELETION_TRANSACTION_TIMEOUT_MS = 60000;

export const processImageDeletionJob = async ({
  imageIds,
  imageOwnerUserId,
}: ImageDeletionJobQueueItem) => {
  const { failedStorageKeys, attemptedImageCount } = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "Images" WHERE id = ANY(${imageIds}::uuid[]) ORDER BY id FOR UPDATE`;

      const hangingImages = await tx.image.findMany({
        where: {
          id: {
            in: imageIds,
          },
          userId: imageOwnerUserId,
          recipeImages: {
            none: {},
          },
          profileImages: {
            none: {},
          },
          discoverRecipeImages: {
            none: {},
          },
        },
        select: {
          id: true,
          key: true,
        },
      });

      if (!hangingImages.length) {
        return {
          failedStorageKeys: [],
          attemptedImageCount: 0,
        };
      }

      const failedStorageKeys = await deleteObjects(
        ObjectTypes.RECIPE_IMAGE,
        hangingImages.map((image) => image.key),
      );
      const failedKeySet = new Set(failedStorageKeys);

      await tx.image.deleteMany({
        where: {
          id: {
            in: hangingImages
              .filter((image) => !failedKeySet.has(image.key))
              .map((image) => image.id),
          },
        },
      });

      return {
        failedStorageKeys,
        attemptedImageCount: hangingImages.length,
      };
    },
    {
      timeout: IMAGE_DELETION_TRANSACTION_TIMEOUT_MS,
    },
  );

  if (failedStorageKeys.length) {
    throw new Error(
      `Failed to delete ${failedStorageKeys.length} of ${attemptedImageCount} images from storage`,
    );
  }
};
