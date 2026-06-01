import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const getMyStats = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getMyStats",
      tags: ["users"],
      summary: "Get aggregate stats for the caller's account",
      protect: true,
    },
  })
  .output(
    z.object({
      recipeCount: z.number().int(),
      recipeImageCount: z.number().int(),
      messageCount: z.number().int(),
      createdAt: z.date(),
      lastLogin: z.date().nullable(),
    }),
  )
  .query(async ({ ctx }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.session.userId,
      },
      select: {
        createdAt: true,
        lastLogin: true,
      },
    });

    const recipeCount = await prisma.recipe.count({
      where: {
        userId: ctx.session.userId,
      },
    });

    const recipeImageCount = await prisma.recipeImage.count({
      where: {
        recipe: {
          userId: ctx.session.userId,
        },
      },
    });

    const messageCount = await prisma.message.count({
      where: {
        OR: [
          {
            toUserId: ctx.session.userId,
          },
          {
            fromUserId: ctx.session.userId,
          },
        ],
      },
    });

    return {
      recipeCount,
      recipeImageCount,
      messageCount,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
  });
