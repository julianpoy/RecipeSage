import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";

export const assertImagesOwned = async (imageIds: string[], userId: string) => {
  if (!imageIds.length) return;
  const owned = await prisma.image.count({
    where: {
      id: {
        in: imageIds,
      },
      userId,
    },
  });
  if (owned !== new Set(imageIds).size) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more images could not be found",
    });
  }
};
