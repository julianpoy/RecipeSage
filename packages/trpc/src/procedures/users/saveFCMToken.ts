import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const saveFCMToken = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/saveFCMToken",
      tags: ["users"],
      summary: "Register a Firebase Cloud Messaging token for the caller",
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
    await prisma.$transaction(async (tx) => {
      await tx.fCMToken.deleteMany({
        where: {
          token: input.fcmToken,
          userId: {
            not: ctx.session.userId,
          },
        },
      });

      const existing = await tx.fCMToken.findFirst({
        where: {
          token: input.fcmToken,
          userId: ctx.session.userId,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        await tx.fCMToken.create({
          data: {
            token: input.fcmToken,
            userId: ctx.session.userId,
          },
        });
      }
    });

    return "Ok";
  });
