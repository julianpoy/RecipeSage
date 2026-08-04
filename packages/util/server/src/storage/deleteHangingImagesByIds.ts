import { prisma, PrismaTransactionClient } from "@recipesage/prisma";
import { deleteObjects, ObjectTypes } from ".";

export const deleteHangingImagesByIds = async (
  userId: string,
  imageIds: string[],
  tx: PrismaTransactionClient = prisma,
) => {
  if (!imageIds.length) return;

  const hangingImages = await tx.image.findMany({
    where: {
      id: {
        in: imageIds,
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

  if (!hangingImages.length) return;

  await deleteObjects(
    ObjectTypes.RECIPE_IMAGE,
    hangingImages.map((image) => image.key),
  );

  await tx.image.deleteMany({
    where: {
      id: {
        in: hangingImages.map((image) => image.id),
      },
    },
  });
};
