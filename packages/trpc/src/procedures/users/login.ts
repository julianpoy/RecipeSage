import { prisma, SessionDTO } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  SessionType,
  generateSession,
  metrics,
  validatePasswordHash,
} from "@recipesage/util/server/general";
import { indexRecipes } from "@recipesage/util/server/search";
import * as Sentry from "@sentry/node";

export const login = publicProcedure
  .input(
    z.object({
      email: z.string(),
      password: z.string(),
    }),
  )
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

    if (
      process.env.NODE_ENV === "selfhost" ||
      process.env.NODE_ENV === "development" ||
      process.env.INDEX_ON_LOGIN === "true"
    ) {
      const recipes = await prisma.recipe.findMany({
        where: {
          userId: user.id,
        },
      });

      indexRecipes(recipes).catch((e) => {
        console.error(e);
        Sentry.captureException(e);
      });
    }

    metrics.userLogin.inc({
      auth_type: "password",
    });

    return {
      token: session.token,
      userId: session.userId,
      email: user.email,
    } satisfies SessionDTO;
  });
