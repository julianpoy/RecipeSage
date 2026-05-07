import { prisma, userPublic, userPublicSchema } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getUserProfileByEmail = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getUserProfileByEmail",
      tags: ["users"],
      summary: "Look up a user profile by email address",
      protect: true,
    },
  })
  .input(
    z.object({
      email: z.string().min(1),
    }),
  )
  .output(userPublicSchema)
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
