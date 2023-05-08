// import { PrismaClient } from '@recipesage/prisma';
// import { FCMToken } from "@prisma/client";

// const getFriendships = async (
//   userId: string
// ) => {
//   const outgoingFriendships = await prisma.friendship.findMany({
//     where: {
//       userId,
//     },
//     include: {
//       friend: {
//         include: {
//           profileImages: true
//         }
//       }
//     }
//   });

//   const outgoingFriendshipsByOtherUserId = outgoingFriendships.reduce((acc, outgoingFriendship) => (
//     { ...acc, [outgoingFriendship.friendId]: outgoingFriendship }
//   ), {});

//   const incomingFriendships = await prisma.friendship.findMany({
//     where: {
//       friendId: userId
//     },
//     include: {
//       user: {
//         include: {
//           profileImages: true
//         }
//       }
//     }
//   });

//   const incomingFriendshipsByOtherUserId = incomingFriendships.reduce((acc, incomingFriendship) => (
//     { ...acc, [incomingFriendship.userId]: incomingFriendship }
//   ), {});

//   const friendshipSummary = [...outgoingFriendships, ...incomingFriendships].reduce((acc, friendship) => {
//     const friendId = friendship.userId === userId ? friendship.friendId : friendship.userId;

//     if (outgoingFriendshipsByOtherUserId[friendId] && incomingFriendshipsByOtherUserId[friendId]) {
//       // Friendship both ways. They are friends!
//       if (!acc.friends.find(friendship => friendship.friendId === friendId)) { // Remove dupes
//         acc.friends.push({
//           friendId,
//           otherUser: outgoingFriendshipsByOtherUserId[friendId].friend
//         });
//       }
//     } else if (outgoingFriendshipsByOtherUserId[friendId]) {
//       // We're requesting them as a friend!
//       acc.outgoingRequests.push({
//         friendId,
//         otherUser: outgoingFriendshipsByOtherUserId[friendId].friend
//       });
//     } else if (incomingFriendshipsByOtherUserId[friendId]) {
//       // They're requesting us as a friend!
//       acc.incomingRequests.push({
//         friendId,
//         otherUser: incomingFriendshipsByOtherUserId[friendId].user
//       });
//     }

//     return acc;
//   }, {
//     outgoingRequests: [],
//     incomingRequests: [],
//     friends: []
//   });

//   return friendshipSummary;
// };

