import { db, friendships, users } from '@recipesage/drizzle';
import { eq } from 'drizzle-orm';

export const getFriendships = async (userId: string) => {
  const outgoingFriendships = await db
    .select({
      id: friendships.id,
      friendId: friendships.friendId,
      userId: friendships.userId,
    })
    .from(friendships)
    .where(eq(friendships.userId, userId));

  const outgoingFriendshipsByOtherUserId = outgoingFriendships.reduce(
    (acc, outgoingFriendship) => ({
      ...acc,
      [outgoingFriendship.friendId]: outgoingFriendship,
    }),
    {} as { [key: string]: (typeof outgoingFriendships)[0] }
  );

  const incomingFriendships = await db
    .select({
      id: friendships.id,
      friendId: friendships.friendId,
      userId: friendships.userId,
    })
    .from(friendships)
    .where(eq(friendships.friendId, userId));

  const incomingFriendshipsByOtherUserId = incomingFriendships.reduce(
    (acc, incomingFriendship) => ({
      ...acc,
      [incomingFriendship.userId]: incomingFriendship,
    }),
    {} as { [key: string]: (typeof incomingFriendships)[0] }
  );

  const friendshipSummary = [
    ...outgoingFriendships,
    ...incomingFriendships,
  ].reduce(
    (acc, friendship) => {
      const friendId =
        friendship.userId === userId ? friendship.friendId : friendship.userId;

      if (
        outgoingFriendshipsByOtherUserId[friendId] &&
        incomingFriendshipsByOtherUserId[friendId]
      ) {
        // Friendship both ways. They are friends!
        if (!acc.friends.find((user) => user === friendId)) {
          // Remove dupes
          acc.friends.push(outgoingFriendshipsByOtherUserId[friendId].friendId);
        }
      } else if (outgoingFriendshipsByOtherUserId[friendId]) {
        // We're requesting them as a friend!
        acc.outgoingRequests.push(
          outgoingFriendshipsByOtherUserId[friendId].friendId
        );
      } else if (incomingFriendshipsByOtherUserId[friendId]) {
        // They're requesting us as a friend!
        acc.incomingRequests.push(
          incomingFriendshipsByOtherUserId[friendId].userId
        );
      }

      return acc;
    },
    {
      outgoingRequests: [] as string[],
      incomingRequests: [] as string[],
      friends: [] as string[],
    }
  );

  return friendshipSummary;
};
