import { prisma, User } from "@recipesage/prisma";

export const getFriendships = async (userId: string) => {
  const outgoingFriendships = await prisma.friendship.findMany({
    where: {
      userId,
    },
    include: {
      friend: {
        include: {
          profileImages: true,
        },
      },
    },
  });

  const outgoingFriendshipsByOtherUserId = outgoingFriendships.reduce(
    (acc, outgoingFriendship) => ({
      ...acc,
      [outgoingFriendship.friendId]: outgoingFriendship,
    }),
    {} as { [key: string]: (typeof outgoingFriendships)[0] }
  );

  const incomingFriendships = await prisma.friendship.findMany({
    where: {
      friendId: userId,
    },
    include: {
      user: {
        include: {
          profileImages: true,
        },
      },
    },
  });

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
        if (!acc.friends.find((user) => user.id === friendId)) {
          // Remove dupes
          acc.friends.push(outgoingFriendshipsByOtherUserId[friendId].friend);
        }
      } else if (outgoingFriendshipsByOtherUserId[friendId]) {
        // We're requesting them as a friend!
        acc.outgoingRequests.push(
          outgoingFriendshipsByOtherUserId[friendId].friend
        );
      } else if (incomingFriendshipsByOtherUserId[friendId]) {
        // They're requesting us as a friend!
        acc.incomingRequests.push(
          incomingFriendshipsByOtherUserId[friendId].user
        );
      }

      return acc;
    },
    {
      outgoingRequests: [] as User[],
      incomingRequests: [] as User[],
      friends: [] as User[],
    }
  );

  return friendshipSummary;
};
