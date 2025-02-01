import { UserPublic } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { getFriendshipUserProfiles } from "@recipesage/util/server/db";

export const getMyFriends = publicProcedure.query(
  async ({
    ctx,
  }): Promise<{
    friends: UserPublic[];
    incomingRequests: UserPublic[];
    outgoingRequests: UserPublic[];
  }> => {
    const session = ctx.session;
    validateTrpcSession(session);

    return getFriendshipUserProfiles(session.userId);
  },
);
