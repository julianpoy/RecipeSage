import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { deleteRecipesAndEnqueueImageDeletion } from "@recipesage/util/server/db";

export const deleteRecipesByLabelIds = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/recipes/deleteRecipesByLabelIds",
      tags: ["recipes"],
      summary: "Delete every recipe that has at least one of the given labels",
      protect: true,
    },
  })
  .input(
    z.object({
      labelIds: z.array(z.uuid()).min(1),
    }),
  )
  .output(z.string())
  .mutation(async ({ ctx, input }) => {
    await prisma.$transaction(
      async (tx) => {
        await deleteRecipesAndEnqueueImageDeletion(
          ctx.session.userId,
          {
            recipeLabels: {
              some: {
                label: {
                  id: {
                    in: input.labelIds,
                  },
                },
              },
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
