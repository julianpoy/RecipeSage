import { Prisma } from "@prisma/client";

/**
 * All recipe fields including labels, user profile, images, etc
 **/
export const recipeSummary = Prisma.validator<Prisma.RecipeFindFirstArgs>()({
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
    rating: true,
    recipeLabels: {
      select: {
        id: true,
        labelId: true,
        recipeId: true,
        createdAt: true,
        updatedAt: true,
        label: {
          select: {
            id: true,
            userId: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            labelGroupId: true,
            labelGroup: {
              select: {
                id: true,
                userId: true,
                title: true,
                warnWhenNotPresent: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
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
    fromUser: {
      select: {
        name: true,
      },
    },
  },
});

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export type RecipeSummary = Prisma.RecipeGetPayload<typeof recipeSummary>;
