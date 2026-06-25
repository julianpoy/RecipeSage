import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { prisma, DiscoverApprovalState } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";

export const rateDiscoverRecipe = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/discover/rateDiscoverRecipe",
      tags: ["discover"],
      summary: "Rate a discover recipe (0 clears your rating)",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      rating: z.number().int().min(0).max(5),
    }),
  )
  .output(
    z.object({
      ratingAverage: z.number(),
      ratingCount: z.number().int(),
      myRating: z.number().int().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const discoverRecipe = await prisma.discoverRecipe.findUnique({
      where: {
        id: input.id,
      },
      select: {
        id: true,
        authorId: true,
        approvalState: true,
      },
    });

    const isAuthor = discoverRecipe?.authorId === ctx.session.userId;
    if (
      !discoverRecipe ||
      (discoverRecipe.approvalState === DiscoverApprovalState.SHADOWBANNED &&
        !isAuthor)
    ) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find that discover recipe",
      });
    }

    return prisma.$transaction(async (tx) => {
      if (input.rating === 0) {
        await tx.discoverRecipeRating.deleteMany({
          where: {
            discoverRecipeId: discoverRecipe.id,
            userId: ctx.session.userId,
          },
        });
      } else {
        await tx.discoverRecipeRating.upsert({
          where: {
            discoverRecipeId_userId: {
              discoverRecipeId: discoverRecipe.id,
              userId: ctx.session.userId,
            },
          },
          create: {
            discoverRecipeId: discoverRecipe.id,
            userId: ctx.session.userId,
            rating: input.rating,
          },
          update: {
            rating: input.rating,
          },
        });
      }

      const aggregate = await tx.discoverRecipeRating.aggregate({
        where: {
          discoverRecipeId: discoverRecipe.id,
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      });

      const ratingAverage = aggregate._avg.rating ?? 0;
      const ratingCount = aggregate._count.rating;

      await tx.discoverRecipe.update({
        where: {
          id: discoverRecipe.id,
        },
        data: {
          ratingAverage,
          ratingCount,
        },
      });

      return {
        ratingAverage,
        ratingCount,
        myRating: input.rating === 0 ? null : input.rating,
      };
    });
  });
