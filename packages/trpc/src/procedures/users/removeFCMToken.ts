import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const removeFCMToken = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/removeFCMToken",
      tags: ["users"],
      summary: "Remove a Firebase Cloud Messaging token for the caller",
      protect: true,
    },
  })
  .input(
    z.object({
      fcmToken: z.string().min(1),
    }),
  )
  .output(z.string())
  .mutation(async ({ input, ctx }): Promise<string> => {
    await prisma.fCMToken.deleteMany({
      where: {
        token: input.fcmToken,
        userId: ctx.session.userId,
      },
    });

    return "Ok";
  });
