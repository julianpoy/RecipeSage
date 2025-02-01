import { LabelSummary, labelSummary, prisma } from "@recipesage/prisma";
import { getFriendshipIds } from "./getFriendshipIds";
import { Prisma } from "@prisma/client";
import { getVisibleProfileItems } from "./getVisibleProfileItems";
import { groupProfileItemsByUserId } from "../general/groupProfileItemsByUserId";

/**
 * Fetches labels for friends, or for a provided list of userIds
 */
export const getVisibleLabels = async (
  contextUserId: string | undefined,
  options: {
    userIds?: string[];
    includeAllFriends?: boolean;
    includeSelf?: boolean;
  },
): Promise<LabelSummary[]> => {
  const includeIds = new Set<string>();
  if (options.userIds) options.userIds.forEach((el) => includeIds.add(el));

  if (contextUserId) {
    const friendships = await getFriendshipIds(contextUserId);
    const friendIds = new Set(friendships.friends);

    if (options.includeAllFriends)
      friendIds.forEach((el) => includeIds.add(el));
    if (options.includeSelf) includeIds.add(contextUserId);
  }

  const visibleProfileItems = await getVisibleProfileItems(contextUserId, [
    ...includeIds,
  ]);
  const profileItemsByUserId = groupProfileItemsByUserId(visibleProfileItems);

  const queryFilters: Prisma.LabelWhereInput[] = [];
  for (const userId of includeIds) {
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
          id: labelId,
        });
        // This costly join may be desired by some users, since it includes labels not just explicitly shared, but includes labels attached to any shared recipes within this label. It may need to be re-evaluated for performance reasons.
        queryFilters.push({
          userId,
          recipeLabels: {
            some: {
              recipe: {
                recipeLabels: {
                  some: {
                    labelId,
                  },
                },
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
          recipeLabels: {
            some: {
              recipeId,
            },
          },
        });
      });
  }

  const labels = await prisma.label.findMany({
    where: {
      OR: queryFilters,
    },
    ...labelSummary,
    orderBy: {
      title: "asc",
    },
  });

  return labels;
};
