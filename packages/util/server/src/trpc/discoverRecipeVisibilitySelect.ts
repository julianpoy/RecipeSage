import { Prisma } from "@recipesage/prisma";

export const discoverRecipeVisibilitySelect = {
  approvalState: true,
  deletedAt: true,
  author: {
    select: {
      id: true,
      discoverStanding: true,
    },
  },
} satisfies Prisma.DiscoverRecipeSelect;
