import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { indexRecipes } from "@recipesage/util/server/search";
import {
  MULTIPLE_IMAGES_UNLOCKED_LIMIT,
  userHasCapability,
} from "@recipesage/util/server/capabilities";
import { Capabilities } from "@recipesage/util/shared";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getFriendshipIds } from "@recipesage/util/server/db";

export const createRecipe = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/createRecipe",
      tags: ["recipes"],
      summary: "Create a recipe",
      protect: true,
    },
  })
  .input(
    z.object({
      title: z.string().min(1).max(254),
      description: z.string(),
      yield: z.string(),
      activeTime: z.string(),
      totalTime: z.string(),
      source: z.string(),
      url: z.string(),
      notes: z.string(),
      ingredients: z.string(),
      instructions: z.string(),
      rating: z.number().min(1).max(5).nullable(),
      folder: z.union([z.literal("main"), z.literal("inbox")]),
      labelIds: z.array(z.uuid()),
      imageIds: z.array(z.uuid()),
      lastMadeAt: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .optional(),
      linkedRecipeIds: z.array(z.uuid()).max(100).optional(),
      nutritionServingSize: z.string().nullable().optional(),
      nutritionCalories: z.number().min(0).nullable().optional(),
      nutritionTotalFat: z.number().min(0).nullable().optional(),
      nutritionSaturatedFat: z.number().min(0).nullable().optional(),
      nutritionTransFat: z.number().min(0).nullable().optional(),
      nutritionPolyunsaturatedFat: z.number().min(0).nullable().optional(),
      nutritionMonounsaturatedFat: z.number().min(0).nullable().optional(),
      nutritionCholesterol: z.number().min(0).nullable().optional(),
      nutritionSodium: z.number().min(0).nullable().optional(),
      nutritionTotalCarbs: z.number().min(0).nullable().optional(),
      nutritionDietaryFiber: z.number().min(0).nullable().optional(),
      nutritionTotalSugars: z.number().min(0).nullable().optional(),
      nutritionAddedSugars: z.number().min(0).nullable().optional(),
      nutritionProtein: z.number().min(0).nullable().optional(),
      nutritionVitaminD: z.number().min(0).nullable().optional(),
      nutritionCalcium: z.number().min(0).nullable().optional(),
      nutritionIron: z.number().min(0).nullable().optional(),
      nutritionPotassium: z.number().min(0).nullable().optional(),
      nutritionOtherDetails: z.string().nullable().optional(),
    }),
  )
  .output(
    z.object({
      id: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const labelIds = input.labelIds || [];
    const doesNotOwnAssignedLabel = !!(await prisma.label.findFirst({
      where: {
        id: {
          in: input.labelIds,
        },
        userId: {
          not: ctx.session.userId,
        },
      },
    }));

    if (doesNotOwnAssignedLabel) {
      throw new TRPCError({
        message: "You do not own one of the specified label ids",
        code: "FORBIDDEN",
      });
    }

    if (input.linkedRecipeIds && input.linkedRecipeIds.length > 0) {
      const friendshipIds = await getFriendshipIds(ctx.session.userId);
      const allowedUserIds = [ctx.session.userId, ...friendshipIds.friends];

      const linkedRecipes = await prisma.recipe.findMany({
        where: {
          id: {
            in: input.linkedRecipeIds,
          },
        },
        select: {
          id: true,
          userId: true,
        },
      });

      const cannotLinkToRecipe = linkedRecipes.find(
        (recipe) => !allowedUserIds.includes(recipe.userId),
      );

      if (cannotLinkToRecipe) {
        throw new TRPCError({
          message:
            "You can only link to recipes you own or recipes from friends",
          code: "FORBIDDEN",
        });
      }

      const missingRecipeIds = input.linkedRecipeIds.filter(
        (id) => !linkedRecipes.find((r) => r.id === id),
      );
      if (missingRecipeIds.length > 0) {
        throw new TRPCError({
          message: "One or more linked recipes do not exist",
          code: "NOT_FOUND",
        });
      }
    }

    const recipeLabels = labelIds.map((labelId) => ({
      labelId,
    }));

    const imageIds = input.imageIds || [];
    const recipeImages = imageIds.map((imageId, idx) => ({
      imageId,
      order: idx,
    }));

    const multipleImagesEnabled = await userHasCapability(
      ctx.session.userId,
      Capabilities.MultipleImages,
    );
    if (multipleImagesEnabled) {
      recipeImages.splice(MULTIPLE_IMAGES_UNLOCKED_LIMIT);
    } else {
      recipeImages.splice(1);
    }

    return prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          title: input.title,
          userId: ctx.session.userId,
          description: input.description,
          yield: input.yield,
          activeTime: input.activeTime,
          totalTime: input.totalTime,
          source: input.source,
          url: input.url,
          notes: input.notes,
          ingredients: input.ingredients,
          instructions: input.instructions,
          rating: input.rating,
          nutritionServingSize: input.nutritionServingSize ?? undefined,
          nutritionCalories: input.nutritionCalories ?? undefined,
          nutritionTotalFat: input.nutritionTotalFat ?? undefined,
          nutritionSaturatedFat: input.nutritionSaturatedFat ?? undefined,
          nutritionTransFat: input.nutritionTransFat ?? undefined,
          nutritionPolyunsaturatedFat:
            input.nutritionPolyunsaturatedFat ?? undefined,
          nutritionMonounsaturatedFat:
            input.nutritionMonounsaturatedFat ?? undefined,
          nutritionCholesterol: input.nutritionCholesterol ?? undefined,
          nutritionSodium: input.nutritionSodium ?? undefined,
          nutritionTotalCarbs: input.nutritionTotalCarbs ?? undefined,
          nutritionDietaryFiber: input.nutritionDietaryFiber ?? undefined,
          nutritionTotalSugars: input.nutritionTotalSugars ?? undefined,
          nutritionAddedSugars: input.nutritionAddedSugars ?? undefined,
          nutritionProtein: input.nutritionProtein ?? undefined,
          nutritionVitaminD: input.nutritionVitaminD ?? undefined,
          nutritionCalcium: input.nutritionCalcium ?? undefined,
          nutritionIron: input.nutritionIron ?? undefined,
          nutritionPotassium: input.nutritionPotassium ?? undefined,
          nutritionOtherDetails: input.nutritionOtherDetails ?? undefined,
          folder: input.folder,
          lastMadeAt: input.lastMadeAt ? new Date(input.lastMadeAt) : null,
          recipeLabels: {
            createMany: {
              data: recipeLabels,
            },
          },
          recipeImages: {
            createMany: {
              data: recipeImages,
            },
          },
        },
      });

      if (input.linkedRecipeIds && input.linkedRecipeIds.length > 0) {
        const bidirectionalLinks = input.linkedRecipeIds.flatMap((linkedId) => [
          {
            recipeId: recipe.id,
            linkedRecipeId: linkedId,
          },
          {
            recipeId: linkedId,
            linkedRecipeId: recipe.id,
          },
        ]);

        await tx.recipeLink.createMany({
          data: bidirectionalLinks,
          skipDuplicates: true,
        });
      }

      await indexRecipes([recipe]);

      return {
        id: recipe.id,
      };
    });
  });
