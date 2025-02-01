import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  SessionType,
  generateSession,
  sendPasswordResetEmail,
} from "@recipesage/util/server/general";

export const forgotPassword = publicProcedure
  .input(
    z.object({
      email: z.string(),
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

    const session = await generateSession(user.id, SessionType.User);

    const appuiOrigin = process.env.APP_UI_BASE_URL || "https://recipesage.com";
    const resetLink = `${appuiOrigin}/#/settings/account?token=${session.token}`;

    await sendPasswordResetEmail({
      toAddresses: [user.email],
      ccAddresses: [],
      resetLink,
    });

    return "Email sent";
  });
