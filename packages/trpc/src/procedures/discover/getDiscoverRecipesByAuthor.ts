import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { Prisma, prisma, DiscoverApprovalState } from "@recipesage/prisma";
import {
  discoverRecipeSummarySchema,
  discoverRecipeSummarySelect,
  prismaDiscoverRecipeToSummary,
} from "./discoverRecipeSchemas";

export const getDiscoverRecipesByAuthor = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/discover/getDiscoverRecipesByAuthor",
      tags: ["discover"],
      summary: "List an author's published discover recipes",
    },
  })
  .input(
    z.object({
      authorId: z.uuid(),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(100).default(40),
    }),
  )
  .output(
    z.object({
      recipes: z.array(discoverRecipeSummarySchema),
    }),
  )
  .query(async ({ ctx, input }) => {
    const isAuthor = ctx.session?.userId === input.authorId;

    const where: Prisma.DiscoverRecipeWhereInput = {
      authorId: input.authorId,
    };
    if (!isAuthor) {
      where.approvalState = DiscoverApprovalState.ACTIVE;
    }

    const discoverRecipes = await prisma.discoverRecipe.findMany({
      where,
      select: discoverRecipeSummarySelect,
      orderBy: {
        createdAt: "desc",
      },
      skip: input.offset,
      take: input.limit,
    });

    return {
      recipes: discoverRecipes.map(prismaDiscoverRecipeToSummary),
    };
  });
