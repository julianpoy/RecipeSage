import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";
import { userPublic, userPublicSchema } from "./userPublic";
import { labelSummary, labelSummarySchema } from "./labelSummary";
import {
  recipeSummaryLite,
  recipeSummaryLiteSchema,
} from "./recipeSummaryLite";

/**
 * All recipe fields including labels, user profile, images, etc
 **/
export const recipeSummary = {
  select: {
    id: true,
    userId: true,
    fromUserId: true,
    title: true,
    description: true,
    yield: true,
    activeTime: true,
    totalTime: true,
    source: true,
    url: true,
    folder: true,
    ingredients: true,
    instructions: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    lastMadeAt: true,
    rating: true,
    nutritionServingSize: true,
    nutritionCalories: true,
    nutritionTotalFat: true,
    nutritionSaturatedFat: true,
    nutritionTransFat: true,
    nutritionPolyunsaturatedFat: true,
    nutritionMonounsaturatedFat: true,
    nutritionCholesterol: true,
    nutritionSodium: true,
    nutritionTotalCarbs: true,
    nutritionDietaryFiber: true,
    nutritionTotalSugars: true,
    nutritionAddedSugars: true,
    nutritionProtein: true,
    nutritionVitaminD: true,
    nutritionCalcium: true,
    nutritionIron: true,
    nutritionPotassium: true,
    nutritionOtherDetails: true,
    recipeLabels: {
      select: {
        id: true,
        labelId: true, // TODO: Remove after v3.3.x has settled
        recipeId: true, // TODO: Remove after v3.3.x has settled
        createdAt: true,
        updatedAt: true,
        label: labelSummary,
      },
    },
    recipeImages: {
      select: {
        id: true,
        order: true,
        imageId: true,
        image: {
          select: {
            id: true,
            location: true,
          },
        },
      },
    },
    recipeLinks: {
      select: {
        id: true,
        linkedRecipe: recipeSummaryLite,
      },
    },
    fromUser: userPublic,
    user: userPublic,
  },
} satisfies Prisma.RecipeFindFirstArgs;

type InternalRecipeSummary = Prisma.RecipeGetPayload<typeof recipeSummary>;

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export type RecipeSummary = Omit<InternalRecipeSummary, "lastMadeAt"> & {
  lastMadeAt: string | null;
};

const linkedRecipeSchema = recipeSummaryLiteSchema.extend({
  lastMadeAt: z.date().nullable(),
});

export const recipeSummarySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  fromUserId: z.uuid().nullable(),
  title: z.string(),
  description: z.string(),
  yield: z.string(),
  activeTime: z.string(),
  totalTime: z.string(),
  source: z.string(),
  url: z.string(),
  folder: z.string(),
  ingredients: z.string(),
  instructions: z.string(),
  notes: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastMadeAt: z.string().nullable(),
  rating: z.number().int().nullable(),
  nutritionServingSize: z.string().nullable(),
  nutritionCalories: z.number().nullable(),
  nutritionTotalFat: z.number().nullable(),
  nutritionSaturatedFat: z.number().nullable(),
  nutritionTransFat: z.number().nullable(),
  nutritionPolyunsaturatedFat: z.number().nullable(),
  nutritionMonounsaturatedFat: z.number().nullable(),
  nutritionCholesterol: z.number().nullable(),
  nutritionSodium: z.number().nullable(),
  nutritionTotalCarbs: z.number().nullable(),
  nutritionDietaryFiber: z.number().nullable(),
  nutritionTotalSugars: z.number().nullable(),
  nutritionAddedSugars: z.number().nullable(),
  nutritionProtein: z.number().nullable(),
  nutritionVitaminD: z.number().nullable(),
  nutritionCalcium: z.number().nullable(),
  nutritionIron: z.number().nullable(),
  nutritionPotassium: z.number().nullable(),
  nutritionOtherDetails: z.string().nullable(),
  recipeLabels: z.array(
    z.object({
      id: z.uuid(),
      labelId: z.uuid(),
      recipeId: z.uuid(),
      createdAt: z.date(),
      updatedAt: z.date(),
      label: labelSummarySchema,
    }),
  ),
  recipeImages: z.array(
    z.object({
      id: z.uuid(),
      order: z.number().int(),
      imageId: z.uuid(),
      image: z.object({
        id: z.uuid(),
        location: z.string(),
      }),
    }),
  ),
  recipeLinks: z.array(
    z.object({
      id: z.uuid(),
      linkedRecipe: linkedRecipeSchema,
    }),
  ),
  fromUser: userPublicSchema.nullable(),
  user: userPublicSchema,
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof recipeSummarySchema
> satisfies RecipeSummary;
const _checkTypeSatisfiesSchema = {} as RecipeSummary satisfies z.infer<
  typeof recipeSummarySchema
>;
