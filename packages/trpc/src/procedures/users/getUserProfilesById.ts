import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { userPublic } from "@recipesage/prisma";
import { z } from "zod";

export const getUserProfilesById = publicProcedure
  .input(
    z.object({
      ids: z.array(z.uuid()).min(1).max(100),
    }),
  )
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
