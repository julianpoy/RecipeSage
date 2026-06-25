import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";

export const unpublishDiscoverRecipe = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/discover/unpublishDiscoverRecipe",
      tags: ["discover"],
      summary: "Remove one of your recipes from the public discover catalog",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(
    z.object({
      id: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const existing = await prisma.discoverRecipe.findFirst({
      where: {
        id: input.id,
        authorId: ctx.session.userId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find that discover recipe",
      });
    }

    await prisma.discoverRecipe.delete({
      where: {
        id: existing.id,
      },
    });

    return {
      id: existing.id,
    };
  });
