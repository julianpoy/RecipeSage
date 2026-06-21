import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const createFriendship = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/createFriendship",
      tags: ["users"],
      summary:
        "Create a friendship from the caller to another user, accepting an incoming request if one exists",
      protect: true,
    },
  })
  .input(
    z.object({
      friendId: z.uuid(),
    }),
  )
  .output(z.string())
  .mutation(async ({ input, ctx }): Promise<string> => {
    if (input.friendId === ctx.session.userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You can't create a friendship with yourself",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        id: input.friendId,
      },
      select: {
        id: true,
      },
    });
    if (!targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No user found with that id",
      });
    }

    await prisma.friendship.upsert({
      where: {
        userId_friendId: {
          userId: ctx.session.userId,
          friendId: input.friendId,
        },
      },
      create: {
        userId: ctx.session.userId,
        friendId: input.friendId,
      },
      update: {},
    });

    return "Created";
  });
