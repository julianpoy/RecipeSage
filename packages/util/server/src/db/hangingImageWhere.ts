import { Prisma } from "@recipesage/prisma";

export const hangingImageWhere: Prisma.ImageWhereInput = {
  recipeImages: {
    none: {},
  },
  profileImages: {
    none: {},
  },
  discoverRecipeImages: {
    none: {},
  },
};
