import {
  prisma,
  PrismaTransactionClient,
  UserPublic,
  userPublic,
} from "@recipesage/prisma";
import { getFriendshipIds } from "./getFriendshipIds";

/**
 * Use to get list of users in each of the 3 possible states of friendship given a userId.
 * Note: Use getFriendshipIds for better performance if user profiles themselves are not needed.
 */
export const getFriendshipUserProfiles = async (
  userId: string,
  tx: PrismaTransactionClient = prisma,
): Promise<{
  outgoingRequests: UserPublic[];
  incomingRequests: UserPublic[];
  friends: UserPublic[];
}> => {
  const friendshipIds = await getFriendshipIds(userId, tx);

  const knownUserPublicProfiles = await tx.user.findMany({
    where: {
      id: {
        in: [
          friendshipIds.friends,
          friendshipIds.incomingRequests,
          friendshipIds.outgoingRequests,
        ].flat(),
      },
    },
    ...userPublic,
  });
  const knownUserPublicProfilesMap = new Map(
    knownUserPublicProfiles.map((el) => [el.id, el]),
  );

  const mapIdToProfile = (el: string) => {
    const profile = knownUserPublicProfilesMap.get(el);
    if (!profile) throw new Error("Friendships changed during lookup");
    return profile;
  };

  const friendshipUsersPublic = {
    friends: friendshipIds.friends.map(mapIdToProfile),
    incomingRequests: friendshipIds.incomingRequests.map(mapIdToProfile),
    outgoingRequests: friendshipIds.outgoingRequests.map(mapIdToProfile),
  };

  return friendshipUsersPublic;
};
