import { prisma, SessionDTO, sessionDTOSchema } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  SessionType,
  generateSession,
  metrics,
  validatePasswordHash,
} from "@recipesage/util/server/general";

export const login = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/login",
      tags: ["users"],
      summary:
        "Authenticate with email and password and receive a session token",
      protect: false,
    },
  })
  .input(
    z.object({
      email: z.string(),
      password: z.string(),
    }),
  )
  .output(sessionDTOSchema)
  .mutation(async ({ input }) => {
    const user = await prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "An account with that email address was not found",
      });
    }

    if (!user.passwordHash || !user.passwordSalt || !user.passwordVersion) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This account does not have a password setup, and instead uses an SSO provider",
      });
    }

    const isPasswordValid = await validatePasswordHash(input.password, {
      passwordHash: user.passwordHash,
      passwordSalt: user.passwordSalt,
      passwordVersion: user.passwordVersion,
    });

    if (!isPasswordValid) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "The password provided is incorrect",
      });
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLogin: new Date(),
      },
    });

    const session = await generateSession(user.id, SessionType.User);

    metrics.userLogin.inc({
      auth_type: "password",
    });

    return {
      token: session.token,
      userId: session.userId,
      email: user.email,
    } satisfies SessionDTO;
  });
