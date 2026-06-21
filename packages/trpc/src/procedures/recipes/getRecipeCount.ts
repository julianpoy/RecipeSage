import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const getRecipeCount = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getRecipeCount",
      tags: ["recipes"],
      summary: "Count the caller's recipes within a folder",
      protect: true,
    },
  })
  .input(
    z.object({
      folder: z.enum(["main", "inbox"]).optional(),
    }),
  )
  .output(
    z.object({
      count: z.number().int(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const count = await prisma.recipe.count({
      where: {
        userId: ctx.session.userId,
        ...(input.folder ? { folder: input.folder } : {}),
      },
    });

    return { count };
  });
