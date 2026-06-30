import * as Sentry from "@sentry/node";
import type { Readable } from "stream";
import { Prisma, PrismaTransactionClient, prisma } from "@recipesage/prisma";
import { getUniqueRecipeTitle } from "./getUniqueRecipeTitle";
import { ObjectTypes, readStream, writeStream } from "../storage";

const SHARED_IMAGE_MIMETYPE = "image/jpeg";

const getDiscoverRecipeUrl = (discoverRecipeId: string) => {
  const base = process.env.APP_UI_BASE_URL || "https://recipesage.com";
  return `${base}/app/discover/${discoverRecipeId}`;
};

export const saveDiscoverRecipeToUser = async (
  discoverRecipeId: string,
  recipientId: string,
  title?: string,
) => {
  const discoverRecipe = await prisma.discoverRecipe.findUnique({
    where: {
      id: discoverRecipeId,
    },
    include: {
      discoverRecipeImages: {
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

  if (!discoverRecipe) {
    return null;
  }

  const copiedImages = (
    await Promise.all(
      discoverRecipe.discoverRecipeImages.map(async (discoverRecipeImage) => {
        let stream: Readable | undefined;
        try {
          stream = await readStream(
            ObjectTypes.RECIPE_IMAGE,
            discoverRecipeImage.image.key,
          );
          const stored = await writeStream(
            ObjectTypes.RECIPE_IMAGE,
            stream,
            SHARED_IMAGE_MIMETYPE,
          );

          return {
            order: discoverRecipeImage.order,
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
    const finalTitle =
      title !== undefined
        ? title
        : await getUniqueRecipeTitle(recipientId, discoverRecipe.title, {
            tx,
          });

    const savedRecipe = await tx.recipe.create({
      data: {
        userId: recipientId,
        fromUserId: discoverRecipe.authorId,
        title: finalTitle,
        description: discoverRecipe.description,
        yield: discoverRecipe.yield,
        activeTime: discoverRecipe.activeTime,
        totalTime: discoverRecipe.totalTime,
        source: "RecipeSage Discover",
        url: getDiscoverRecipeUrl(discoverRecipe.id),
        notes: discoverRecipe.notes,
        ingredients: discoverRecipe.ingredients,
        instructions: discoverRecipe.instructions,
        folder: "main",
        nutritionServingSize: discoverRecipe.nutritionServingSize,
        nutritionCalories: discoverRecipe.nutritionCalories,
        nutritionTotalFat: discoverRecipe.nutritionTotalFat,
        nutritionSaturatedFat: discoverRecipe.nutritionSaturatedFat,
        nutritionTransFat: discoverRecipe.nutritionTransFat,
        nutritionPolyunsaturatedFat: discoverRecipe.nutritionPolyunsaturatedFat,
        nutritionMonounsaturatedFat: discoverRecipe.nutritionMonounsaturatedFat,
        nutritionCholesterol: discoverRecipe.nutritionCholesterol,
        nutritionSodium: discoverRecipe.nutritionSodium,
        nutritionTotalCarbs: discoverRecipe.nutritionTotalCarbs,
        nutritionDietaryFiber: discoverRecipe.nutritionDietaryFiber,
        nutritionTotalSugars: discoverRecipe.nutritionTotalSugars,
        nutritionAddedSugars: discoverRecipe.nutritionAddedSugars,
        nutritionProtein: discoverRecipe.nutritionProtein,
        nutritionVitaminD: discoverRecipe.nutritionVitaminD,
        nutritionCalcium: discoverRecipe.nutritionCalcium,
        nutritionIron: discoverRecipe.nutritionIron,
        nutritionPotassium: discoverRecipe.nutritionPotassium,
        nutritionOtherDetails: discoverRecipe.nutritionOtherDetails,
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
          recipeId: savedRecipe.id,
          imageId: image.id,
          order: orderByImageKey.get(image.key) ?? 0,
        })),
      });
    }

    return savedRecipe;
  };
};
