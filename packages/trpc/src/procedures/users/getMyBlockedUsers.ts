import {
  prisma,
  userPublic,
  userPublicSchema,
  type UserPublic,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const getMyBlockedUsers = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getMyBlockedUsers",
      tags: ["users"],
      summary: "Get the users that the caller has blocked",
      protect: true,
    },
  })
  .output(z.array(userPublicSchema))
  .query(async ({ ctx }): Promise<UserPublic[]> => {
    return prisma.user.findMany({
      where: {
        incomingUserBlocks: {
          some: {
            blockerUserId: ctx.session.userId,
          },
        },
      },
      ...userPublic,
      orderBy: {
        name: "asc",
      },
    });
  });
