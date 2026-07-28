import { Prisma, ProfileItem } from "@recipesage/prisma";
import { prisma } from "@recipesage/prisma";
import { getFriendshipIds } from "./getFriendshipIds";

export interface RecipeVisibility {
  allRecipesUserIds: string[];
  partialShares: {
    userId: string;
    labelIds: string[];
    recipeIds: string[];
  }[];
}

export const isRecipeVisibilityEmpty = (visibility: RecipeVisibility) =>
  !visibility.allRecipesUserIds.length && !visibility.partialShares.length;

export const resolveRecipeVisibility = async (args: {
  tx?: Prisma.TransactionClient;
  userId?: string;
  userIds: string[];
  friendIds?: Set<string>;
}): Promise<RecipeVisibility> => {
  const { tx = prisma, userId: contextUserId, userIds } = args;

  if (
    contextUserId &&
    userIds.length &&
    userIds.every((userId) => userId === contextUserId)
  ) {
    return {
      allRecipesUserIds: [contextUserId],
      partialShares: [],
    };
  }

  let friendIds: Set<string> = contextUserId
    ? (args.friendIds ?? new Set())
    : new Set();
  if (contextUserId && !args.friendIds) {
    const friendships = await getFriendshipIds(contextUserId);
    friendIds = new Set(friendships.friends);
  }

  const friendUserIds = userIds.filter(
    (userId) => friendIds.has(userId) && userId !== contextUserId,
  );
  const nonFriendUserIds = userIds.filter(
    (userId) => !friendIds.has(userId) && userId !== contextUserId,
  );

  const profileItems = await tx.profileItem.findMany({
    where: {
      OR: [
        {
          userId: {
            in: friendUserIds,
          },
        },
        {
          userId: {
            in: nonFriendUserIds,
          },
          visibility: "public",
        },
      ],
    },
  });

  const profileItemsByUserId = profileItems.reduce(
    (acc, profileItem) => {
      acc[profileItem.userId] ??= [];
      acc[profileItem.userId].push(profileItem);
      return acc;
    },
    {} as { [key: string]: ProfileItem[] },
  );

  const allRecipesUserIds: string[] = [];
  const partialShares: RecipeVisibility["partialShares"] = [];
  for (const userId of userIds) {
    const isContextUser = contextUserId && userId === contextUserId;
    const profileItemsForUser = profileItemsByUserId[userId] || [];

    const isSharingAll = profileItemsForUser.find(
      (profileItem) => profileItem.type === "all-recipes",
    );

    if (isContextUser || isSharingAll) {
      allRecipesUserIds.push(userId);
      continue;
    }

    const labelIds = profileItemsForUser
      .filter((profileItem) => profileItem.type === "label")
      .map((profileItem) => profileItem.labelId)
      .filter((labelId): labelId is string => !!labelId);

    const recipeIds = profileItemsForUser
      .filter((profileItem) => profileItem.type === "recipe")
      .map((profileItem) => profileItem.recipeId)
      .filter((recipeId): recipeId is string => !!recipeId);

    if (labelIds.length || recipeIds.length) {
      partialShares.push({
        userId,
        labelIds,
        recipeIds,
      });
    }
  }

  return {
    allRecipesUserIds,
    partialShares,
  };
};
