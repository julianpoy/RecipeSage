import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  MULTIPLE_IMAGES_UNLOCKED_LIMIT,
  userHasCapability,
} from "@recipesage/util/server/capabilities";
import { Capabilities } from "@recipesage/util/shared";
import { indexRecipes } from "@recipesage/util/server/search";
import { getFriendshipIds } from "@recipesage/util/server/db";

export const updateRecipe = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/updateRecipe",
      tags: ["recipes"],
      summary: "Update a recipe",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
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
    const initialRecipe = await prisma.recipe.findUnique({
      where: {
        id: input.id,
        userId: ctx.session.userId,
      },
      include: {
        recipeImages: true,
      },
    });
    if (!initialRecipe) {
      throw new TRPCError({
        message: "Recipe not found",
        code: "NOT_FOUND",
      });
    }

    const _existingLinkedRecipeIds = await prisma.recipeLink.findMany({
      where: {
        recipeId: input.id,
      },
      select: {
        linkedRecipeId: true,
      },
    });
    const existingLinkedRecipeIds = new Set(
      _existingLinkedRecipeIds.map((link) => link.linkedRecipeId),
    );

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

    if (input.linkedRecipeIds) {
      const newLinkedRecipeIds = input.linkedRecipeIds.filter(
        (id) => !existingLinkedRecipeIds.has(id),
      );

      if (newLinkedRecipeIds.length > 0) {
        const friendshipIds = await getFriendshipIds(ctx.session.userId);
        const allowedUserIds = [ctx.session.userId, ...friendshipIds.friends];

        const linkedRecipes = await prisma.recipe.findMany({
          where: {
            id: {
              in: newLinkedRecipeIds,
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

        const missingRecipeIds = newLinkedRecipeIds.filter(
          (id) => !linkedRecipes.find((r) => r.id === id),
        );
        if (missingRecipeIds.length > 0) {
          throw new TRPCError({
            message: "One or more linked recipes do not exist",
            code: "NOT_FOUND",
          });
        }
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
      // We don't want to break user's experience for:
      // 1. Multiple images has expired, so they're updating a recipe they created when it was valid
      // 2. This recipe was shared to them via another user who has multiple images enabled, and they're making adjustments to the recipe
      // In this case we allow just as many images as were originally on the recipe, to a minimum of 1.
      const allowedCount = Math.max(1, initialRecipe.recipeImages.length);
      recipeImages.splice(allowedCount);
    }

    return prisma.$transaction(async (tx) => {
      if (input.linkedRecipeIds !== undefined) {
        const currentLinkedIds = input.linkedRecipeIds;
        const linkedRecipeIdsToRemove = Array.from(
          existingLinkedRecipeIds,
        ).filter((id) => !currentLinkedIds.includes(id));
        const linkedRecipeIdsToAdd = currentLinkedIds.filter(
          (id) => !existingLinkedRecipeIds.has(id),
        );

        await tx.recipeLink.deleteMany({
          where: {
            OR: [
              {
                recipeId: input.id,
                linkedRecipeId: {
                  in: linkedRecipeIdsToRemove,
                },
              },
              {
                recipeId: {
                  in: linkedRecipeIdsToRemove,
                },
                linkedRecipeId: input.id,
              },
            ],
          },
        });

        const bidirectionalLinks = linkedRecipeIdsToAdd.flatMap((linkedId) => [
          {
            recipeId: input.id,
            linkedRecipeId: linkedId,
          },
          {
            recipeId: linkedId,
            linkedRecipeId: input.id,
          },
        ]);

        if (bidirectionalLinks.length > 0) {
          await tx.recipeLink.createMany({
            data: bidirectionalLinks,
            skipDuplicates: true,
          });
        }
      }

      await tx.recipeLabel.deleteMany({
        where: {
          recipeId: input.id,
        },
      });

      await tx.recipeImage.deleteMany({
        where: {
          recipeId: input.id,
        },
      });

      const recipe = await tx.recipe.update({
        where: {
          id: input.id,
        },
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
          nutritionServingSize: input.nutritionServingSize,
          nutritionCalories: input.nutritionCalories,
          nutritionTotalFat: input.nutritionTotalFat,
          nutritionSaturatedFat: input.nutritionSaturatedFat,
          nutritionTransFat: input.nutritionTransFat,
          nutritionPolyunsaturatedFat: input.nutritionPolyunsaturatedFat,
          nutritionMonounsaturatedFat: input.nutritionMonounsaturatedFat,
          nutritionCholesterol: input.nutritionCholesterol,
          nutritionSodium: input.nutritionSodium,
          nutritionTotalCarbs: input.nutritionTotalCarbs,
          nutritionDietaryFiber: input.nutritionDietaryFiber,
          nutritionTotalSugars: input.nutritionTotalSugars,
          nutritionAddedSugars: input.nutritionAddedSugars,
          nutritionProtein: input.nutritionProtein,
          nutritionVitaminD: input.nutritionVitaminD,
          nutritionCalcium: input.nutritionCalcium,
          nutritionIron: input.nutritionIron,
          nutritionPotassium: input.nutritionPotassium,
          nutritionOtherDetails: input.nutritionOtherDetails,
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

      await indexRecipes([recipe]);

      return {
        id: recipe.id,
      };
    });
  });
