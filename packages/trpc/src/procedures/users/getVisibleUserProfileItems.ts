import {
  prisma,
  profileItemSummary,
  profileItemSummarySchema,
} from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { convertPrismaProfileItemsToProfileItemSummaries } from "@recipesage/util/server/db";
import { z } from "zod";

export const getVisibleUserProfileItems = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getVisibleUserProfileItems",
      tags: ["users"],
      summary:
        "Get the showcased profile items for a user, filtered by what the caller is allowed to see",
    },
  })
  .input(
    z.object({
      userId: z.uuid(),
    }),
  )
  .output(z.array(profileItemSummarySchema))
  .query(async ({ input, ctx }) => {
    const contextUserId = ctx.session?.userId;
    const isOwnProfile = contextUserId === input.userId;

    if (!isOwnProfile) {
      const profileUser = await prisma.user.findUnique({
        where: {
          id: input.userId,
        },
        select: {
          enableProfile: true,
        },
      });

      if (!profileUser?.enableProfile) {
        return [];
      }
    }

    let canSeeFriendsOnlyItems = isOwnProfile;
    if (contextUserId && !isOwnProfile) {
      const incomingFriendship = await prisma.friendship.findFirst({
        where: {
          userId: input.userId,
          friendId: contextUserId,
        },
        select: {
          id: true,
        },
      });
      canSeeFriendsOnlyItems = !!incomingFriendship;
    }

    const profileItems = await prisma.profileItem.findMany({
      where: {
        userId: input.userId,
        ...(canSeeFriendsOnlyItems ? {} : { visibility: "public" }),
      },
      orderBy: {
        order: "asc",
      },
      ...profileItemSummary,
    });

    return convertPrismaProfileItemsToProfileItemSummaries(profileItems);
  });
