import { prisma, userPublic, userPublicSchema } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const getUserProfileByHandle = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getUserProfileByHandle",
      tags: ["users"],
      summary: "Look up a user profile by public handle",
    },
  })
  .input(
    z.object({
      handle: z.string().min(1),
    }),
  )
  .output(userPublicSchema)
  .query(async ({ input }) => {
    const profile = await prisma.user.findFirst({
      where: {
        handle: input.handle.toLowerCase(),
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
