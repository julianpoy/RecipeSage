import { Prisma } from "@recipesage/prisma";
import { z } from "zod";
import { discoverPubliclyVisibleWhere } from "@recipesage/util/server/trpc";

export const DISCOVER_APPROVAL_STATES = [
  "PENDING",
  "ACTIVE",
  "SHADOWBANNED",
] as const;

export const discoverRecipeImageSchema = z.object({
  order: z.number().int(),
  image: z.object({
    id: z.uuid(),
    location: z.string(),
  }),
});

export const discoverRecipeAuthorSchema = z.object({
  id: z.uuid(),
  handle: z.string().nullable(),
  name: z.string(),
});

export const discoverRecipeLinkedSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  discoverRecipeImages: z.array(discoverRecipeImageSchema),
});

export const discoverNutritionSchema = z.object({
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
});

export const discoverRecipeSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  language: z.string(),
  categories: z.array(z.string()),
  approvalState: z.enum(DISCOVER_APPROVAL_STATES),
  ratingAverage: z.number(),
  ratingCount: z.number().int(),
  saveCount: z.number().int(),
  createdAt: z.date(),
  modifiedAt: z.date().nullable(),
  author: discoverRecipeAuthorSchema,
  discoverRecipeImages: z.array(discoverRecipeImageSchema),
});

export const discoverRecipeDetailSchema = discoverRecipeSummarySchema
  .extend(discoverNutritionSchema.shape)
  .extend({
    yield: z.string(),
    activeTime: z.string(),
    totalTime: z.string(),
    ingredients: z.string(),
    instructions: z.string(),
    notes: z.string(),
    myRating: z.number().int().nullable(),
    isSaved: z.boolean(),
    linkedRecipes: z.array(discoverRecipeLinkedSummarySchema),
  });

export type DiscoverRecipeSummary = z.infer<typeof discoverRecipeSummarySchema>;
export type DiscoverRecipeDetail = z.infer<typeof discoverRecipeDetailSchema>;

export const discoverRecipeSummarySelect = {
  id: true,
  title: true,
  description: true,
  language: true,
  categories: true,
  approvalState: true,
  ratingAverage: true,
  ratingCount: true,
  saveCount: true,
  createdAt: true,
  modifiedAt: true,
  deletedAt: true,
  author: {
    select: {
      id: true,
      handle: true,
      name: true,
      discoverStanding: true,
    },
  },
  discoverRecipeImages: {
    select: {
      order: true,
      image: {
        select: {
          id: true,
          location: true,
        },
      },
    },
    orderBy: {
      order: "asc",
    },
  },
} satisfies Prisma.DiscoverRecipeSelect;

export const discoverRecipeDetailSelect = {
  ...discoverRecipeSummarySelect,
  yield: true,
  activeTime: true,
  totalTime: true,
  ingredients: true,
  instructions: true,
  notes: true,
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
  discoverRecipeLinks: {
    where: {
      linkedDiscoverRecipe: discoverPubliclyVisibleWhere(),
    },
    select: {
      linkedDiscoverRecipe: {
        select: {
          id: true,
          title: true,
          discoverRecipeImages: {
            select: {
              order: true,
              image: {
                select: {
                  id: true,
                  location: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  },
} satisfies Prisma.DiscoverRecipeSelect;

type DiscoverRecipeSummaryPayload = Prisma.DiscoverRecipeGetPayload<{
  select: typeof discoverRecipeSummarySelect;
}>;

type DiscoverRecipeDetailPayload = Prisma.DiscoverRecipeGetPayload<{
  select: typeof discoverRecipeDetailSelect;
}>;

export const prismaDiscoverRecipeToSummary = (
  discoverRecipe: DiscoverRecipeSummaryPayload,
): DiscoverRecipeSummary => {
  return {
    id: discoverRecipe.id,
    title: discoverRecipe.title,
    description: discoverRecipe.description,
    language: discoverRecipe.language,
    categories: discoverRecipe.categories,
    approvalState: discoverRecipe.approvalState,
    ratingAverage: discoverRecipe.ratingAverage,
    ratingCount: discoverRecipe.ratingCount,
    saveCount: discoverRecipe.saveCount,
    createdAt: discoverRecipe.createdAt,
    modifiedAt: discoverRecipe.modifiedAt,
    author: {
      id: discoverRecipe.author.id,
      handle: discoverRecipe.author.handle,
      name: discoverRecipe.author.name,
    },
    discoverRecipeImages: discoverRecipe.discoverRecipeImages.map(
      (discoverRecipeImage) => ({
        order: discoverRecipeImage.order,
        image: {
          id: discoverRecipeImage.image.id,
          location: discoverRecipeImage.image.location,
        },
      }),
    ),
  };
};

export const prismaDiscoverRecipeToDetail = (
  discoverRecipe: DiscoverRecipeDetailPayload,
  viewer: {
    myRating: number | null;
    isSaved: boolean;
  },
): DiscoverRecipeDetail => {
  return {
    ...prismaDiscoverRecipeToSummary(discoverRecipe),
    yield: discoverRecipe.yield,
    activeTime: discoverRecipe.activeTime,
    totalTime: discoverRecipe.totalTime,
    ingredients: discoverRecipe.ingredients,
    instructions: discoverRecipe.instructions,
    notes: discoverRecipe.notes,
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
    myRating: viewer.myRating,
    isSaved: viewer.isSaved,
    linkedRecipes: discoverRecipe.discoverRecipeLinks.map((link) => ({
      id: link.linkedDiscoverRecipe.id,
      title: link.linkedDiscoverRecipe.title,
      discoverRecipeImages: link.linkedDiscoverRecipe.discoverRecipeImages.map(
        (discoverRecipeImage) => ({
          order: discoverRecipeImage.order,
          image: {
            id: discoverRecipeImage.image.id,
            location: discoverRecipeImage.image.location,
          },
        }),
      ),
    })),
  };
};

export const discoverRecipeContentInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(10000),
  yield: z.string().max(255),
  activeTime: z.string().max(255),
  totalTime: z.string().max(255),
  notes: z.string().max(10000),
  ingredients: z.string().max(20000),
  instructions: z.string().max(20000),
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
});
