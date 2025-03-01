import { Prisma } from "@prisma/client";

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export const recipeSummaryLite = Prisma.validator<Prisma.RecipeFindFirstArgs>()(
  {
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
      createdAt: true,
      updatedAt: true,
      rating: true,
      recipeLabels: {
        select: {
          label: {
            select: {
              title: true,
            },
          },
        },
      },
      recipeImages: {
        select: {
          order: true,
          image: {
            select: {
              location: true,
            },
          },
        },
      },
      fromUser: {
        select: {
          name: true,
        },
      },
    },
  },
);

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export type RecipeSummaryLite = Prisma.RecipeGetPayload<
  typeof recipeSummaryLite
>;
