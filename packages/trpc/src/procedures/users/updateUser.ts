import { z } from "zod";
import { publicProcedure } from "../../trpc";
import {
  generatePasswordHash,
  sanitizeUserEmail,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";

export const updateUser = publicProcedure
  .input(
    z.object({
      name: z.string().min(1).max(1000).optional(),
      email: z.string().email().min(1).max(1000).optional(),
      password: z.string().min(6).max(1000).optional(),
    }),
  )
  .mutation(async ({ input, ctx }): Promise<string> => {
    const session = ctx.session;
    validateTrpcSession(session);

    await prisma.$transaction(async (tx) => {
      if (input.name) {
        await tx.user.update({
          where: {
            id: session.userId,
          },
          data: {
            name: input.name,
          },
        });
      }

      if (input.email) {
        const sanitizedEmail = sanitizeUserEmail(input.email);
        const existingUser = await tx.user.findFirst({
          where: {
            id: {
              not: session.userId,
            },
            email: sanitizedEmail,
          },
          select: {
            id: true,
          },
        });
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That email address is already in use by another account",
          });
        }
        await tx.user.update({
          where: {
            id: session.userId,
          },
          data: {
            email: sanitizedEmail,
          },
        });
      }

      if (input.password) {
        const hashedPasswordInfo = await generatePasswordHash(input.password);

        await tx.user.update({
          where: {
            id: session.userId,
          },
          data: {
            passwordHash: hashedPasswordInfo.hash,
            passwordSalt: hashedPasswordInfo.salt,
            passwordVersion: hashedPasswordInfo.version,
          },
        });

        await tx.fCMToken.deleteMany({
          where: {
            userId: session.userId,
          },
        });

        await tx.session.deleteMany({
          where: {
            userId: session.userId,
          },
        });
      }
    });

    return "Updated";
  });
