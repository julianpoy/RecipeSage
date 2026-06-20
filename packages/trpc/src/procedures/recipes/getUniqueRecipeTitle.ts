import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { getUniqueRecipeTitle as resolveUniqueRecipeTitle } from "@recipesage/util/server/db";

export const getUniqueRecipeTitle = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/recipes/getUniqueRecipeTitle",
      tags: ["recipes"],
      summary:
        "Suggest a non-conflicting title for a new recipe (e.g. 'Spaghetti (2)')",
      protect: true,
    },
  })
  .input(
    z.object({
      ignoreIds: z.array(z.uuid()).optional(),
      title: z.string().min(1),
    }),
  )
  .output(z.string().optional())
  .query(async ({ ctx, input }) => {
    return resolveUniqueRecipeTitle(ctx.session.userId, input.title, {
      ignoreRecipeIds: input.ignoreIds,
    });
  });
