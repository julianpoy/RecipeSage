import { Friendship, User, Image } from "../models/index.js";

export const getFriendships = async (userId) => {
  const outgoingFriendships = await Friendship.findAll({
    where: {
      userId,
    },
    include: [
      {
        model: User,
        as: "friend",
        attributes: ["id", "name", "handle", "enableProfile"],
        include: [
          {
            model: Image,
            as: "profileImages",
            attributes: ["id", "location"],
          },
        ],
      },
    ],
  });

  const outgoingFriendshipsByOtherUserId = outgoingFriendships.reduce(
    (acc, outgoingFriendship) => ({
      ...acc,
      [outgoingFriendship.friendId]: outgoingFriendship,
    }),
    {},
  );

  const incomingFriendships = await Friendship.findAll({
    where: {
      friendId: userId,
    },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "handle", "enableProfile"],
        include: [
          {
            model: Image,
            as: "profileImages",
            attributes: ["id", "location"],
          },
        ],
      },
    ],
  });

  const incomingFriendshipsByOtherUserId = incomingFriendships.reduce(
    (acc, incomingFriendship) => ({
      ...acc,
      [incomingFriendship.userId]: incomingFriendship,
    }),
    {},
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
        if (
          !acc.friends.find((friendship) => friendship.friendId === friendId)
        ) {
          // Remove dupes
          acc.friends.push({
            friendId,
            otherUser: outgoingFriendshipsByOtherUserId[friendId].friend,
          });
        }
      } else if (outgoingFriendshipsByOtherUserId[friendId]) {
        // We're requesting them as a friend!
        acc.outgoingRequests.push({
          friendId,
          otherUser: outgoingFriendshipsByOtherUserId[friendId].friend,
        });
      } else if (incomingFriendshipsByOtherUserId[friendId]) {
        // They're requesting us as a friend!
        acc.incomingRequests.push({
          friendId,
          otherUser: incomingFriendshipsByOtherUserId[friendId].user,
        });
      }

      return acc;
    },
    {
      outgoingRequests: [],
      incomingRequests: [],
      friends: [],
    },
  );

  return friendshipSummary;
};
