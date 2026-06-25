import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import * as Sentry from "@sentry/node";

export const reportDiscoverRecipe = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/discover/reportDiscoverRecipe",
      tags: ["discover"],
      summary: "Report a discover recipe for moderator review",
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      reason: z.string().min(5).max(2000),
    }),
  )
  .output(
    z.object({
      reported: z.literal(true),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const discoverRecipe = await prisma.discoverRecipe.findUnique({
      where: {
        id: input.id,
      },
      select: {
        id: true,
        title: true,
        authorId: true,
        approvalState: true,
      },
    });

    if (!discoverRecipe) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find that discover recipe",
      });
    }

    Sentry.captureMessage("Discover recipe reported", {
      level: "warning",
      tags: {
        discoverRecipeId: discoverRecipe.id,
      },
      extra: {
        discoverRecipeId: discoverRecipe.id,
        title: discoverRecipe.title,
        authorId: discoverRecipe.authorId,
        approvalState: discoverRecipe.approvalState,
        reportedByUserId: ctx.session?.userId ?? null,
        reason: input.reason,
      },
    });

    return {
      reported: true,
    };
  });
