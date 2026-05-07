import { prisma, userPublic, userPublicSchema } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";

export const getUserProfilesById = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getUserProfilesById",
      tags: ["users"],
      summary: "Look up user profiles by id",
    },
  })
  .input(
    z.object({
      ids: z.array(z.uuid()).min(1).max(100),
    }),
  )
  .output(z.array(userPublicSchema))
  .query(async ({ input }) => {
    const profiles = await prisma.user.findMany({
      where: {
        id: {
          in: input.ids,
        },
      },
      ...userPublic,
    });

    return profiles;
  });
