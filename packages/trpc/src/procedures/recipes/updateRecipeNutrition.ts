import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { validateTrpcSession } from "@recipesage/util/server/general";

const ingredientNutritionSchema = z.record(
  z.string(),
  z.object({
    name: z.string(),
    quantity: z.number().optional(),
    unit: z.string().optional(),
    grams: z.number(),
    preparation: z.string().optional(),
    estimated: z.boolean().optional(),
    optional: z.boolean().optional(),
    note: z.string().optional(),
    calories: z.number().optional(),
    fat: z.number().optional(),
    carbs: z.number().optional(),
    protein: z.number().optional(),
    source: z
      .object({
        database: z.string(),
        id: z.string(),
        url: z.string().optional(),
        name: z.string(),
        brand: z.string().nullable().optional(),
      })
      .optional(),
  }),
);

export const updateRecipeNutrition = publicProcedure
  .input(
    z.object({
      id: z.uuid(),
      nutritionServingSize: z.string().nullable().optional(),
      nutritionCalories: z.number().int().nullable().optional(),
      nutritionCarbs: z.number().int().nullable().optional(),
      nutritionProtein: z.number().int().nullable().optional(),
      nutritionFat: z.number().int().nullable().optional(),
      nutritionSaturatedFat: z.number().int().nullable().optional(),
      nutritionUnsaturatedFat: z.number().int().nullable().optional(),
      nutritionFiber: z.number().int().nullable().optional(),
      nutritionSugar: z.number().int().nullable().optional(),
      nutritionSodium: z.number().int().nullable().optional(),
      nutritionCholesterol: z.number().int().nullable().optional(),
      ingredientNutrition: ingredientNutritionSchema.nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const recipe = await prisma.recipe.findUnique({
      where: {
        id: input.id,
        userId: session.userId,
      },
      select: { id: true },
    });

    if (!recipe) {
      throw new TRPCError({
        message: "Recipe not found",
        code: "NOT_FOUND",
      });
    }

    const { id, ...nutritionData } = input;

    // Filter out undefined values to only update provided fields
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(nutritionData)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const updatedRecipe = await prisma.recipe.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nutritionServingSize: true,
        nutritionCalories: true,
        nutritionCarbs: true,
        nutritionProtein: true,
        nutritionFat: true,
        nutritionSaturatedFat: true,
        nutritionUnsaturatedFat: true,
        nutritionFiber: true,
        nutritionSugar: true,
        nutritionSodium: true,
        nutritionCholesterol: true,
        ingredientNutrition: true,
      },
    });

    return updatedRecipe;
  });
