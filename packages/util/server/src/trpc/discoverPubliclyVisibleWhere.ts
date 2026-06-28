import {
  Prisma,
  DiscoverApprovalState,
  UserDiscoverStanding,
} from "@recipesage/prisma";

export const discoverPubliclyVisibleWhere =
  (): Prisma.DiscoverRecipeWhereInput => ({
    approvalState: DiscoverApprovalState.ACTIVE,
    deletedAt: null,
    author: {
      discoverStanding: {
        not: UserDiscoverStanding.SHADOWBANNED,
      },
    },
  });
