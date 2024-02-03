import { prisma } from "@recipesage/prisma";

/**
 * Use to get list of user IDs in each of the 3 possible states of friendship given a userId.
 * Note: Use getFriendshipUsers if user profiles are needed at the cost of performance.
 */
export const getFriendshipIds = async (
  userId: string,
): Promise<{
  incomingRequests: string[];
  outgoingRequests: string[];
  friends: string[];
}> => {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        {
          userId,
        },
        {
          friendId: userId,
        },
      ],
    },
    select: {
      userId: true,
      friendId: true,
    },
  });

  const friendshipsByOtherUserId: Record<string, typeof friendships> = {};
  friendships.forEach((friendship) => {
    const otherUserId =
      friendship.userId === userId ? friendship.friendId : friendship.userId;
    friendshipsByOtherUserId[otherUserId] ??= [];
    friendshipsByOtherUserId[otherUserId].push(friendship);
  });

  const incomingRequests: string[] = [];
  const outgoingRequests: string[] = [];
  const friends: string[] = [];
  Object.entries(friendshipsByOtherUserId).forEach(
    ([otherUserId, friendships]) => {
      if (friendships.length > 1) {
        friends.push(otherUserId);
      } else if (userId === friendships[0].userId) {
        outgoingRequests.push(otherUserId);
      } else {
        incomingRequests.push(otherUserId);
      }
    },
  );

  return {
    incomingRequests,
    outgoingRequests,
    friends,
  };
};
