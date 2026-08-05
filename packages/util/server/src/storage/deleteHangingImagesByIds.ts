import { prisma, PrismaTransactionClient } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import { deleteObjects, ObjectTypes } from ".";

const IMAGE_ID_CHUNK_SIZE = 1000;

const chunkIds = (imageIds: string[]): string[][] => {
  const chunks: string[][] = [];
  for (let idx = 0; idx < imageIds.length; idx += IMAGE_ID_CHUNK_SIZE) {
    chunks.push(imageIds.slice(idx, idx + IMAGE_ID_CHUNK_SIZE));
  }
  return chunks;
};

/**
 * CRITICAL: the returned purgeFromStorage function must be called *after* the
 * surrounding transaction has committed. Storage deletion cannot be rolled
 * back, so calling it while the transaction is still open means a later
 * rollback restores the image rows while their objects are already gone.
 */
export const deleteHangingImagesByIds = async (
  userId: string,
  imageIds: string[],
  tx: PrismaTransactionClient = prisma,
): Promise<() => Promise<void>> => {
  const keys: string[] = [];

  for (const imageIdChunk of chunkIds(imageIds)) {
    const hangingImages = await tx.image.findMany({
      where: {
        id: {
          in: imageIdChunk,
        },
        userId,
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

    if (!hangingImages.length) continue;

    await tx.image.deleteMany({
      where: {
        id: {
          in: hangingImages.map((image) => image.id),
        },
      },
    });

    keys.push(...hangingImages.map((image) => image.key));
  }

  return async function purgeFromStorage() {
    if (!keys.length) return;

    try {
      await deleteObjects(ObjectTypes.RECIPE_IMAGE, keys);
    } catch (e) {
      Sentry.captureException(e, {
        extra: {
          userId,
          keyCount: keys.length,
        },
      });
    }
  };
};
