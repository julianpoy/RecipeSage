import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import {
  prisma,
  DiscoverReportSource,
  DiscoverReportStatus,
} from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";

export const reportDiscoverRecipe = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/discover/reportDiscoverRecipe",
      tags: ["discover"],
      summary: "Report a discover recipe for moderator review",
      protect: true,
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
    const discoverRecipe = await prisma.discoverRecipe.findFirst({
      where: {
        id: input.id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!discoverRecipe) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find that discover recipe",
      });
    }

    const reason = input.reason.trim();

    await prisma.discoverRecipeReport.upsert({
      where: {
        discoverRecipeId_reporterId: {
          discoverRecipeId: discoverRecipe.id,
          reporterId: ctx.session.userId,
        },
      },
      create: {
        discoverRecipeId: discoverRecipe.id,
        source: DiscoverReportSource.USER,
        reporterId: ctx.session.userId,
        reason,
      },
      update: {
        reason,
        status: DiscoverReportStatus.OPEN,
      },
    });

    return {
      reported: true,
    };
  });
