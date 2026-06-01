import { UserPublic, userPublicSchema } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { getFriendshipUserProfiles } from "@recipesage/util/server/db";
import { z } from "zod";

export const getMyFriends = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getMyFriends",
      tags: ["users"],
      summary:
        "Get the caller's friends, plus pending incoming and outgoing friend requests",
      protect: true,
    },
  })
  .output(
    z.object({
      friends: z.array(userPublicSchema),
      incomingRequests: z.array(userPublicSchema),
      outgoingRequests: z.array(userPublicSchema),
    }),
  )
  .query(
    async ({
      ctx,
    }): Promise<{
      friends: UserPublic[];
      incomingRequests: UserPublic[];
      outgoingRequests: UserPublic[];
    }> => {
      return getFriendshipUserProfiles(ctx.session.userId);
    },
  );
