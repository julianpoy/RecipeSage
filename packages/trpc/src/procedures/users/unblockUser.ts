import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const unblockUser = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/unblockUser",
      tags: ["users"],
      summary: "Remove a block that the caller placed on another user",
      protect: true,
    },
  })
  .input(
    z.object({
      userId: z.uuid(),
    }),
  )
  .output(z.string())
  .mutation(async ({ input, ctx }): Promise<string> => {
    await prisma.userBlock.deleteMany({
      where: {
        blockerUserId: ctx.session.userId,
        blockedUserId: input.userId,
      },
    });

    return "Ok";
  });
