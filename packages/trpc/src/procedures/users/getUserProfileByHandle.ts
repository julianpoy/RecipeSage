import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { userPublic } from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getUserProfileByHandle = publicProcedure
  .input(
    z.object({
      handle: z.string().min(1),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const profile = await prisma.user.findFirst({
      where: {
        handle: input.handle,
        enableProfile: true,
      },
      ...userPublic,
    });

    if (!profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No profile found with that handle",
      });
    }

    return profile;
  });
