import { prisma, SessionDTO, sessionDTOSchema } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import appleSignin from "apple-signin-auth";
import { TRPCError } from "@trpc/server";
import {
  SessionType,
  generateSession,
  config,
  metrics,
} from "@recipesage/util/server/general";

export const signInWithApple = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/signInWithApple",
      tags: ["users"],
      summary:
        "Authenticate with an Apple identity token and receive a session token",
      protect: false,
      errorResponses: {
        400: "The identity token is invalid or missing a verified email",
        404: "An account with that email address was not found",
        500: "Internal server error",
      },
    },
  })
  .input(
    z.object({
      identityToken: z.string(),
      nonce: z.string().optional(),
      name: z.string().optional(),
      allowRegistration: z.boolean().default(true),
    }),
  )
  .output(sessionDTOSchema)
  .mutation(async ({ input }) => {
    const { servicesId, bundleId } = config.apple.signIn;
    const audience = [servicesId, bundleId].filter(
      (value): value is string => !!value,
    );
    if (audience.length === 0) {
      throw new TRPCError({
        message: "Apple Sign In is not configured",
        code: "INTERNAL_SERVER_ERROR",
      });
    }

    let payload: Awaited<ReturnType<typeof appleSignin.verifyIdToken>>;
    try {
      payload = await appleSignin.verifyIdToken(input.identityToken, {
        audience,
      });
    } catch {
      throw new TRPCError({
        message: "Invalid identity token",
        code: "BAD_REQUEST",
      });
    }

    if (input.nonce && payload.nonce !== input.nonce) {
      throw new TRPCError({
        message: "Invalid identity token",
        code: "BAD_REQUEST",
      });
    }

    const email = payload.email;
    const emailVerified =
      payload.email_verified === true || payload.email_verified === "true";
    if (!email || !emailVerified) {
      throw new TRPCError({
        message: "Invalid identity token",
        code: "BAD_REQUEST",
      });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
      },
    });

    if (!existingUser && !input.allowRegistration) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "An account with that email address was not found",
      });
    }

    const user = await prisma.user.upsert({
      where: {
        email: normalizedEmail,
      },
      create: {
        name: input.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
      },
      update: {
        lastLogin: new Date(),
      },
    });

    const session = await generateSession(user.id, SessionType.User);

    if (existingUser) {
      metrics.userLogin.inc({
        auth_type: "apple",
      });
    } else {
      metrics.userCreated.inc({
        auth_type: "apple",
      });
    }

    return {
      token: session.token,
      userId: session.userId,
      email: user.email,
    } satisfies SessionDTO;
  });
