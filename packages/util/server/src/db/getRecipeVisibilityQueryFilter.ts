import { Prisma, ProfileItem } from "@prisma/client";
import { prisma } from "@recipesage/prisma";
import { getFriendshipIds } from "./getFriendshipIds";

/**
 * Gets the Prisma filters that should be applied to get all recipes
 * a user can access given some parameters.
 * The result of this function should be ORd together
 */
export const getRecipeVisibilityQueryFilter = async (args: {
  tx?: Prisma.TransactionClient;
  userId?: string;
  userIds: string[];
}) => {
  const { tx = prisma, userId: contextUserId, userIds } = args;

  let friends: Set<string> = new Set();
  if (contextUserId) {
    const friendships = await getFriendshipIds(contextUserId);
    friends = new Set(friendships.friends);
  }

  const friendUserIds = userIds.filter(
    (userId) => friends.has(userId) && userId !== contextUserId,
  );
  const nonFriendUserIds = userIds.filter(
    (userId) => !friends.has(userId) && userId !== contextUserId,
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

  const queryFilters: Prisma.RecipeWhereInput[] = [];
  for (const userId of userIds) {
    const isContextUser = contextUserId && userId === contextUserId;
    const profileItemsForUser = profileItemsByUserId[userId] || [];

    const isSharingAll = profileItemsForUser.find(
      (profileItem) => profileItem.type === "all-recipes",
    );

    if (isContextUser || isSharingAll) {
      queryFilters.push({
        userId,
      });
    }

    profileItemsForUser
      .filter((profileItem) => profileItem.type === "label")
      .map((profileItem) => profileItem.labelId)
      .filter((labelId): labelId is string => !!labelId)
      .forEach((labelId) => {
        queryFilters.push({
          userId,
          recipeLabels: {
            some: {
              labelId,
            },
          },
        });
      });

    profileItemsForUser
      .filter((profileItem) => profileItem.type === "recipe")
      .map((profileItem) => profileItem.recipeId)
      .filter((recipeId): recipeId is string => !!recipeId)
      .forEach((recipeId) => {
        queryFilters.push({
          userId,
          id: recipeId,
        });
      });
  }

  return queryFilters;
};
