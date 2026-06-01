import { z } from "zod";
import { authenticatedProcedure } from "../../trpc";
import {
  generatePasswordHash,
  sanitizeUserEmail,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";

export const updateUser = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/updateUser",
      tags: ["users"],
      summary: "Update the caller's name, email, and/or password",
      protect: true,
    },
  })
  .input(
    z.object({
      name: z.string().min(1).max(254).optional(),
      email: z.email().min(1).max(254).optional(),
      password: z.string().min(6).max(1000).optional(),
    }),
  )
  .output(z.string())
  .mutation(async ({ input, ctx }): Promise<string> => {
    await prisma.$transaction(async (tx) => {
      if (input.name) {
        await tx.user.update({
          where: {
            id: ctx.session.userId,
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
              not: ctx.session.userId,
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
            id: ctx.session.userId,
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
            id: ctx.session.userId,
          },
          data: {
            passwordHash: hashedPasswordInfo.hash,
            passwordSalt: hashedPasswordInfo.salt,
            passwordVersion: hashedPasswordInfo.version,
          },
        });

        await tx.fCMToken.deleteMany({
          where: {
            userId: ctx.session.userId,
          },
        });

        await tx.session.deleteMany({
          where: {
            userId: ctx.session.userId,
          },
        });
      }
    });

    return "Updated";
  });
