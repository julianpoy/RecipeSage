import * as Sentry from "@sentry/node";
import type { Readable } from "stream";
import { Prisma, PrismaTransactionClient, prisma } from "@recipesage/prisma";
import { getUniqueRecipeTitle } from "./getUniqueRecipeTitle";
import { ObjectTypes, readStream, writeStream } from "../storage";

const SHARED_IMAGE_MIMETYPE = "image/jpeg";

export const shareRecipeToUser = async (
  recipeId: string,
  recipientId: string,
) => {
  const original = await prisma.recipe.findUnique({
    where: {
      id: recipeId,
    },
    include: {
      recipeImages: {
        select: {
          order: true,
          image: {
            select: {
              key: true,
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!original) {
    return null;
  }

  const copiedImages = (
    await Promise.all(
      original.recipeImages.map(async (recipeImage) => {
        let stream: Readable | undefined;
        try {
          stream = await readStream(
            ObjectTypes.RECIPE_IMAGE,
            recipeImage.image.key,
          );
          const stored = await writeStream(
            ObjectTypes.RECIPE_IMAGE,
            stream,
            SHARED_IMAGE_MIMETYPE,
          );

          return {
            order: recipeImage.order,
            stored,
          };
        } catch (e) {
          stream?.destroy();
          Sentry.captureException(e);
          return null;
        }
      }),
    )
  ).filter((copiedImage) => copiedImage !== null);

  return async (tx: PrismaTransactionClient) => {
    const adjustedTitle = await getUniqueRecipeTitle(
      recipientId,
      original.title,
      {
        tx,
      },
    );

    const sharedRecipe = await tx.recipe.create({
      data: {
        userId: recipientId,
        title: adjustedTitle,
        description: original.description,
        yield: original.yield,
        activeTime: original.activeTime,
        totalTime: original.totalTime,
        source: original.source,
        url: original.url,
        notes: original.notes,
        ingredients: original.ingredients,
        instructions: original.instructions,
        folder: "inbox",
        fromUserId: original.userId,
        nutritionServingSize: original.nutritionServingSize,
        nutritionCalories: original.nutritionCalories,
        nutritionTotalFat: original.nutritionTotalFat,
        nutritionSaturatedFat: original.nutritionSaturatedFat,
        nutritionTransFat: original.nutritionTransFat,
        nutritionPolyunsaturatedFat: original.nutritionPolyunsaturatedFat,
        nutritionMonounsaturatedFat: original.nutritionMonounsaturatedFat,
        nutritionCholesterol: original.nutritionCholesterol,
        nutritionSodium: original.nutritionSodium,
        nutritionTotalCarbs: original.nutritionTotalCarbs,
        nutritionDietaryFiber: original.nutritionDietaryFiber,
        nutritionTotalSugars: original.nutritionTotalSugars,
        nutritionAddedSugars: original.nutritionAddedSugars,
        nutritionProtein: original.nutritionProtein,
        nutritionVitaminD: original.nutritionVitaminD,
        nutritionCalcium: original.nutritionCalcium,
        nutritionIron: original.nutritionIron,
        nutritionPotassium: original.nutritionPotassium,
        nutritionOtherDetails: original.nutritionOtherDetails,
      },
    });

    if (copiedImages.length) {
      const orderByImageKey = new Map(
        copiedImages.map((copiedImage) => [
          copiedImage.stored.key,
          copiedImage.order,
        ]),
      );

      const savedImages = await tx.image.createManyAndReturn({
        data: copiedImages.map((copiedImage) => ({
          userId: recipientId,
          location: copiedImage.stored.location,
          key: copiedImage.stored.key,
          json: copiedImage.stored as unknown as Prisma.JsonObject,
        })),
      });

      await tx.recipeImage.createMany({
        data: savedImages.map((image) => ({
          recipeId: sharedRecipe.id,
          imageId: image.id,
          order: orderByImageKey.get(image.key) ?? 0,
        })),
      });
    }

    return sharedRecipe;
  };
};
