import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  SessionType,
  config,
  generateSession,
  sendPasswordResetEmail,
} from "@recipesage/util/server/general";

export const forgotPassword = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/forgotPassword",
      tags: ["users"],
      summary: "Send a password-reset email to the given address",
      protect: false,
    },
  })
  .input(
    z.object({
      email: z.string(),
    }),
  )
  .output(z.string())
  .mutation(async ({ input, ctx }) => {
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

    const session = await generateSession(user.id, SessionType.User);

    const appuiOrigin = config.appUi.baseUrl;
    const resetLink = `${appuiOrigin}/app/settings/account?token=${session.token}`;

    await sendPasswordResetEmail({
      toAddresses: [user.email],
      ccAddresses: [],
      resetLink,
      language: ctx.language,
    });

    return "Email sent";
  });
