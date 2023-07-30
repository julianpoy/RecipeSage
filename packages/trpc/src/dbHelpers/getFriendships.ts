import { Friendship, User, mikro } from "@recipesage/mikroorm";

export const getFriendships = async (userId: string) => {
  const outgoingFriendships = await mikro.em.find(Friendship, {
    user: userId,
  }, {
    populate: ['user', 'user.profileImages']
  });

  const outgoingFriendshipsByOtherUserId = outgoingFriendships.reduce(
    (acc, outgoingFriendship) => ({
      ...acc,
      [outgoingFriendship.friend.id]: outgoingFriendship,
    }),
    {} as { [key: string]: (typeof outgoingFriendships)[0] }
  );

  const incomingFriendships = await mikro.em.find(Friendship, {
    friend: userId,
  }, {
    populate: ['user', 'user.profileImages']
  });

  const incomingFriendshipsByOtherUserId = incomingFriendships.reduce(
    (acc, incomingFriendship) => ({
      ...acc,
      [incomingFriendship.user.id]: incomingFriendship,
    }),
    {} as { [key: string]: (typeof incomingFriendships)[0] }
  );

  const friendshipSummary = [
    ...outgoingFriendships,
    ...incomingFriendships,
  ].reduce(
    (acc, friendship) => {
      const friendId =
        friendship.user.id === userId ? friendship.friend.id : friendship.user.id;

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
