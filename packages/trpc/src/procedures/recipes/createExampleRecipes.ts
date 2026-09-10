import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { translate } from "@recipesage/util/server/general";
import { exampleRecipeDefinitions } from "@recipesage/util/server/db";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const createExampleRecipes = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/createExampleRecipes",
      tags: ["recipes"],
      summary: "Create a set of example recipes for the current user",
      protect: true,
    },
  })
  .output(
    z.object({
      created: z.number(),
    }),
  )
  .mutation(async ({ ctx }) => {
    const userId = ctx.session.userId;
    const labelTitle = cleanLabelTitle(
      await translate(ctx.language, "seed.exampleRecipes.label"),
    );

    const recipes = await Promise.all(
      exampleRecipeDefinitions.map(async (definition) => {
        const [
          title,
          description,
          recipeYield,
          activeTime,
          totalTime,
          notes,
          ingredients,
          instructions,
        ] = await Promise.all([
          translate(ctx.language, definition.i18nKeys.title),
          translate(ctx.language, definition.i18nKeys.description),
          translate(ctx.language, definition.i18nKeys.yield),
          translate(ctx.language, definition.i18nKeys.activeTime),
          translate(ctx.language, definition.i18nKeys.totalTime),
          translate(ctx.language, definition.i18nKeys.notes),
          translate(ctx.language, definition.i18nKeys.ingredients),
          translate(ctx.language, definition.i18nKeys.instructions),
        ]);

        return {
          definition,
          title,
          description,
          recipeYield,
          activeTime,
          totalTime,
          notes,
          ingredients,
          instructions,
        };
      }),
    );

    const allImageIds = exampleRecipeDefinitions.flatMap((definition) =>
      definition.images.map((image) => image.id),
    );
    const existingImages = await prisma.image.findMany({
      where: { id: { in: allImageIds } },
      select: { id: true },
    });
    const existingImageIds = new Set(existingImages.map((image) => image.id));
    const missingImageIds = allImageIds.filter(
      (id) => !existingImageIds.has(id),
    );
    if (missingImageIds.length > 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Example recipe images have not been seeded. Run the CLI seed command.",
      });
    }

    await prisma.$transaction(async (tx) => {
      let label = await tx.label.findFirst({
        where: {
          userId,
          title: labelTitle,
        },
      });
      if (!label) {
        label = await tx.label.create({
          data: {
            userId,
            title: labelTitle,
          },
        });
      }

      for (const recipe of recipes) {
        const { definition } = recipe;
        await tx.recipe.create({
          data: {
            userId,
            title: recipe.title,
            description: recipe.description,
            yield: recipe.recipeYield,
            activeTime: recipe.activeTime,
            totalTime: recipe.totalTime,
            source: definition.source,
            url: definition.url,
            notes: recipe.notes,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            rating: definition.rating,
            folder: definition.folder,
            nutritionServingSize: definition.nutrition?.nutritionServingSize,
            nutritionCalories: definition.nutrition?.nutritionCalories,
            nutritionTotalFat: definition.nutrition?.nutritionTotalFat,
            nutritionSaturatedFat: definition.nutrition?.nutritionSaturatedFat,
            nutritionTransFat: definition.nutrition?.nutritionTransFat,
            nutritionPolyunsaturatedFat:
              definition.nutrition?.nutritionPolyunsaturatedFat,
            nutritionMonounsaturatedFat:
              definition.nutrition?.nutritionMonounsaturatedFat,
            nutritionCholesterol: definition.nutrition?.nutritionCholesterol,
            nutritionSodium: definition.nutrition?.nutritionSodium,
            nutritionTotalCarbs: definition.nutrition?.nutritionTotalCarbs,
            nutritionDietaryFiber: definition.nutrition?.nutritionDietaryFiber,
            nutritionTotalSugars: definition.nutrition?.nutritionTotalSugars,
            nutritionAddedSugars: definition.nutrition?.nutritionAddedSugars,
            nutritionProtein: definition.nutrition?.nutritionProtein,
            nutritionVitaminD: definition.nutrition?.nutritionVitaminD,
            nutritionCalcium: definition.nutrition?.nutritionCalcium,
            nutritionIron: definition.nutrition?.nutritionIron,
            nutritionPotassium: definition.nutrition?.nutritionPotassium,
            recipeLabels: {
              create: {
                labelId: label.id,
              },
            },
            recipeImages: {
              createMany: {
                data: definition.images.map((image, order) => ({
                  imageId: image.id,
                  order,
                })),
              },
            },
          },
        });
      }
    });

    return {
      created: recipes.length,
    };
  });
