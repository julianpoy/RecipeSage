import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { deleteRecipesAndEnqueueImageDeletion } from "@recipesage/util/server/db";

export const deleteRecipesByIds = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/deleteRecipesByIds",
      tags: ["recipes"],
      summary: "Delete multiple recipes by id",
      protect: true,
    },
  })
  .input(
    z.object({
      ids: z.array(z.uuid()).min(1),
    }),
  )
  .output(z.string())
  .mutation(async ({ ctx, input }) => {
    await prisma.$transaction(
      async (tx) => {
        await deleteRecipesAndEnqueueImageDeletion(
          ctx.session.userId,
          {
            id: {
              in: input.ids,
            },
          },
          tx,
        );
      },
      {
        timeout: 60000,
      },
    );

    return "Ok";
  });
