import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const getIsHandleAvailable = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getIsHandleAvailable",
      tags: ["users"],
      summary: "Check whether a profile handle is available to be claimed",
      protect: true,
    },
  })
  .input(
    z.object({
      handle: z.string().min(1),
    }),
  )
  .output(
    z.object({
      available: z.boolean(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const existingUser = await prisma.user.findFirst({
      where: {
        handle: input.handle.toLowerCase(),
        id: {
          not: ctx.session.userId,
        },
      },
      select: {
        id: true,
      },
    });

    return {
      available: !existingUser,
    };
  });
