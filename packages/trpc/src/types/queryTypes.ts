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

export const recipesInflated = Prisma.validator<Prisma.RecipeArgs>()({
  include: {
    recipeLabels: {
      include: {
        label: true,
      },
    },
    recipeImages: {
      include: {
        image: true,
      },
    },
    fromUser: userPublic,
    user: userPublic,
  },
});

export type RecipesInflated = Prisma.RecipeGetPayload<typeof recipesInflated>;
