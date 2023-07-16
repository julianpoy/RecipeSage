import { Prisma } from "@prisma/client";

export const userPublic = Prisma.validator<Prisma.UserArgs>()({
  select: {
    id: true,
    email: true,
    name: true,
    handle: true,
    profileVisibility: true,
    enableProfile: true,
  },
});

export type UserPublic = Prisma.UserGetPayload<typeof userPublic>;

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export const recipeSummary = Prisma.validator<Prisma.RecipeArgs>()({
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
    fromUser: userPublic,
    user: userPublic,
  },
});

/**
 * Provides fields necessary for displaying a summary about a recipe,
 * not including ingredients, instructions, notes, etc.
 **/
export type RecipeSummary = Prisma.RecipeGetPayload<typeof recipeSummary>;
