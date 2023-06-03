import { Prisma, User, ProfileItem } from "@prisma/client";
import { prisma } from "@recipesage/prisma";
import { getFriendships } from "./getFriendships";

export const getRecipesWithConstraints = async (args: {
  tx?: Prisma.TransactionClient;
  userId?: string;
  userIds: string[];
  folder: string;
  orderBy: Prisma.RecipeOrderByWithRelationInput;
  offset: number;
  limit: number;
  recipeIds?: string[];
  labels?: string[];
  labelIntersection?: boolean;
  ratings?: number[];
}) => {
  const {
    tx = prisma,
    userId: contextUserId,
    userIds,
    folder,
    orderBy,
    offset,
    limit,
    recipeIds: filterByRecipeIds,
    labels,
    labelIntersection,
    ratings,
  } = args;

  let friends: { [key: string]: User } = {};
  if (contextUserId) {
    const friendships = await getFriendships(contextUserId);
    friends = friendships.friends.reduce(
      (acc, friend) => ((acc[friend.id] = friend), acc),
      {} as typeof friends
    );
  }

  const friendUserIds = userIds.filter(
    (userId) => friends[userId] && userId !== contextUserId
  );
  const nonFriendUserIds = userIds.filter(
    (userId) => !friends[userId] && userId !== contextUserId
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

  const profileItemsByUserId = profileItems.reduce((acc, profileItem) => {
    acc[profileItem.userId] ??= [];
    acc[profileItem.userId].push(profileItem);
    return acc;
  }, {} as { [key: string]: ProfileItem[] });

  const queryFilters: Prisma.RecipeWhereInput[] = [];
  for (const userId of userIds) {
    const isContextUser = contextUserId && userId === contextUserId;
    const profileItemsForUser = profileItemsByUserId[userId] || [];

    const isSharingAll = profileItemsForUser.find(
      (profileItem) => profileItem.type === "all-recipes"
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
              label: {
                id: labelId,
              },
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

  if (!queryFilters.length)
    return {
      data: [],
      totalCount: 0,
    };

  const where = {
    OR: queryFilters,
    ...(ratings ? { rating: { in: ratings } } : {}),
    ...(filterByRecipeIds ? { id: { in: filterByRecipeIds } } : {}),
    folder,
  } as Prisma.RecipeWhereInput;

  if (labels && labelIntersection) {
    where.AND = labels.map(
      (label) =>
        ({
          recipeLabels: {
            some: {
              label: {
                title: label,
              },
            },
          },
        } as Prisma.RecipeWhereInput)
    );
  }

  if (labels && !labelIntersection) {
    where.recipeLabels = {
      some: {
        label: {
          title: {
            in: labels,
          },
        },
      },
    };
  }

  const totalCount = await tx.recipe.findMany({
    where,
  });

  const recipes = await tx.recipe.findMany({
    where,
    include: {
      // labels: true,
      // images: true,
      // fromUser: true,
    },
    orderBy,
    skip: offset,
    take: limit,
  });

  return {
    data: recipes,
    totalCount,
  };
};
