import { Prisma, ProfileItem } from "@prisma/client";
import { prisma } from "@recipesage/prisma";
import { getFriendshipIds } from "./getFriendshipIds";
import {
  RecipeSummaryLite,
  recipeSummaryLite,
} from "../types/recipeSummaryLite";

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
  ratings?: (number | null)[];
}): Promise<{ recipes: RecipeSummaryLite[]; totalCount: number }> => {
  const {
    tx = prisma,
    userId: contextUserId,
    userIds,
    folder,
    orderBy,
    offset,
    limit,
    recipeIds: filterByRecipeIds,
    labels: _labels,
    labelIntersection,
    ratings,
    recipeIds,
  } = args;

  const labels = _labels?.filter((label) => label !== "unlabeled");
  const mustBeUnlabeled = !!_labels?.includes("unlabeled");

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
      recipes: [],
      totalCount: 0,
    };

  const where = {
    AND: [] as Prisma.RecipeWhereInput[],
  } satisfies Prisma.RecipeWhereInput;

  where.AND.push({
    OR: queryFilters,
  });
  where.AND.push({
    folder,
  });

  if (recipeIds) {
    where.AND.push({ id: { in: recipeIds } });
  }

  if (ratings) {
    where.AND.push({
      OR: ratings.map((rating) => ({
        rating,
      })),
    });
  }

  if (filterByRecipeIds) {
    where.AND.push({ id: { in: filterByRecipeIds } });
  }

  if (mustBeUnlabeled) {
    where.AND.push({
      recipeLabels: {
        none: {
          label: {
            userId: {
              in: userIds, // We do this rather than none:{} due to Prisma perf issues...
            },
          },
        },
      },
    });
  }

  if (labels?.length && labelIntersection) {
    where.AND.push(
      ...labels.map(
        (label) =>
          ({
            recipeLabels: {
              some: {
                label: {
                  title: label,
                },
              },
            },
          }) as Prisma.RecipeWhereInput,
      ),
    );
  }

  if (labels?.length && !labelIntersection) {
    where.AND.push({
      recipeLabels: {
        some: {
          label: {
            title: {
              in: labels,
            },
          },
        },
      },
    });
  }

  const [totalCount, recipes] = await Promise.all([
    tx.recipe.count({
      where,
    }),
    tx.recipe.findMany({
      where,
      ...recipeSummaryLite,
      orderBy,
      skip: offset,
      take: limit,
    }),
  ]);

  return {
    recipes,
    totalCount,
  };
};
