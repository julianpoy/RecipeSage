import { prisma, PrismaTransactionClient } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import { deleteObjects, ObjectTypes } from ".";

/**
 * CRITICAL: the returned purgeFromStorage function must be called *after* the
 * surrounding transaction has committed. Storage deletion cannot be rolled
 * back, so calling it while the transaction is still open means a later
 * rollback restores the image rows while their objects are already gone.
 */
export const deleteHangingImagesForUser = async (
  userId: string,
  tx: PrismaTransactionClient = prisma,
): Promise<() => Promise<void>> => {
  const hangingImages = await tx.image.findMany({
    where: {
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

  const keys: string[] = [];

  if (hangingImages.length) {
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
