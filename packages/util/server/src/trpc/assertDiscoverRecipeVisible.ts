import {
  DiscoverApprovalState,
  UserDiscoverStanding,
} from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";

interface DiscoverRecipeVisibility {
  approvalState: DiscoverApprovalState;
  deletedAt: Date | null;
  author: {
    id: string;
    discoverStanding: UserDiscoverStanding;
  };
}

const isDiscoverRecipeVisible = (
  discoverRecipe: DiscoverRecipeVisibility,
  viewerUserId: string | undefined,
): boolean => {
  if (discoverRecipe.deletedAt) return false;

  const isAuthor =
    viewerUserId !== undefined && viewerUserId === discoverRecipe.author.id;
  if (isAuthor) return true;

  if (discoverRecipe.approvalState !== DiscoverApprovalState.ACTIVE) {
    return false;
  }
  if (
    discoverRecipe.author.discoverStanding === UserDiscoverStanding.SHADOWBANNED
  ) {
    return false;
  }
  return true;
};

export const assertDiscoverRecipeVisible = (
  discoverRecipe: DiscoverRecipeVisibility,
  viewerUserId: string | undefined,
) => {
  if (!isDiscoverRecipeVisible(discoverRecipe, viewerUserId)) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Could not find that discover recipe",
    });
  }
};
