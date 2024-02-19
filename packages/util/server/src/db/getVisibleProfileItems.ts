import { prisma } from "@recipesage/prisma";
import { getFriendshipIds } from "./getFriendshipIds";

/**
 * Fetches a list of profile items that are visible to the current context user.
 * If no context user is provided, only public items will be returned
 *
 * @param contextUserId The current user. If not provided, only public items will be returned.
 * @param userIds A list of users for whom we want to retrieve profile items for.
 */
export const getVisibleProfileItems = async (
  contextUserId: string | undefined,
  userIds: string[],
) => {
  let friendIds: Set<string>;
  if (contextUserId) {
    const friendships = await getFriendshipIds(contextUserId);
    friendIds = new Set(friendships.friends);
  } else {
    friendIds = new Set([]);
  }

  const includedFriendUserIds = userIds.filter(
    (userId) => friendIds.has(userId) && userId !== contextUserId,
  );
  const includedNonFriendUserIds = userIds.filter(
    (userId) => !friendIds.has(userId) && userId !== contextUserId,
  );

  const profileItems = await prisma.profileItem.findMany({
    where: {
      OR: [
        {
          userId: {
            in: includedFriendUserIds,
          },
        },
        {
          userId: {
            in: includedNonFriendUserIds,
          },
          visibility: "public",
        },
      ],
    },
  });

  return profileItems;
};
