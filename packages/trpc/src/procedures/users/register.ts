import { prisma, SessionDTO } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import Sentry from "@sentry/node";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  SessionType,
  generatePasswordHash,
  generateSession,
  metrics,
  sanitizeUserEmail,
  sendWelcomeEmail,
} from "@recipesage/util/server/general";

export const register = publicProcedure
  .input(
    z.object({
      name: z.string().min(1).max(1000),
      email: z.string().email().min(1).max(1000),
      password: z.string().min(6).max(1000),
    }),
  )
  .mutation(async ({ input }) => {
    if (process.env.DISABLE_REGISTRATION === "true") {
      const message =
        "Registration is disabled via the DISABLE_REGISTRATION environment variable.";

      console.error(message);
      throw new TRPCError({
        code: "FORBIDDEN",
        message,
      });
    }

    let sanitizedEmail = "";
    try {
      sanitizedEmail = sanitizeUserEmail(input.email);
    } catch (_e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Email is not in a valid format",
      });
    }

    const sessionDTO = await prisma.$transaction(async (tx) => {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: sanitizedEmail,
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with that email address already exists",
        });
      }

      const passwordHashInfo = await generatePasswordHash(input.password);

      const user = await tx.user.create({
        data: {
          name: input.name,
          email: sanitizedEmail,
          passwordHash: passwordHashInfo.hash,
          passwordSalt: passwordHashInfo.salt,
          passwordVersion: passwordHashInfo.version,
        },
      });

      const session = await generateSession(user.id, SessionType.User, tx);

      return {
        token: session.token,
        userId: session.userId,
        email: user.email,
      } satisfies SessionDTO;
    });

    sendWelcomeEmail({
      toAddresses: [sanitizedEmail],
      ccAddresses: [],
    }).catch((err) => {
      Sentry.captureException(err);
    });

    metrics.userCreated.inc({
      auth_type: "password",
    });

    return sessionDTO;
  });
