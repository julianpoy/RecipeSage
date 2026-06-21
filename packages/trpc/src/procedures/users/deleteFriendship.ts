import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const deleteFriendship = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/deleteFriendship",
      tags: ["users"],
      summary:
        "Remove the friendship between the caller and another user in both directions",
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
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          {
            userId: ctx.session.userId,
            friendId: input.friendId,
          },
          {
            userId: input.friendId,
            friendId: ctx.session.userId,
          },
        ],
      },
    });

    return "Ok";
  });
