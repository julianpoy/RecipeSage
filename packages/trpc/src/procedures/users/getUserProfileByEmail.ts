import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { userPublic } from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getUserProfileByEmail = publicProcedure
  .input(
    z.object({
      email: z.string().min(1),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const profile = await prisma.user.findFirst({
      where: {
        email: input.email,
      },
      ...userPublic,
    });

    if (!profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No profile found with that email",
      });
    }

    return profile;
  });
