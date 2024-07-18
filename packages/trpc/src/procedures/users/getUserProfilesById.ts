import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { userPublic } from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";

export const getUserProfilesById = publicProcedure
  .input(
    z.object({
      ids: z.array(z.string().uuid()).min(1).max(100),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

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
