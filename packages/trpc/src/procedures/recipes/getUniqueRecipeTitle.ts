import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { prisma } from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { recipeSummaryLite } from "@recipesage/prisma";
import { stripNumberedRecipeTitle } from "@recipesage/util/shared";

/**
 * An arbitrary upper limit for rename attempts so we don't spin forever
 */
const MAX_DUPE_RENAMES = 1001;
const MAX_DUPES_RETRIEVED = 1000;

export const getUniqueRecipeTitle = publicProcedure
  .input(
    z.object({
      ignoreIds: z.array(z.string().min(1)).optional(),
      title: z.string().min(1),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const strippedRecipeTitle = stripNumberedRecipeTitle(input.title);

    const recipes = await prisma.recipe.findMany({
      where: {
        userId: session.userId,
        id: {
          notIn: input.ignoreIds || [],
        },
        OR: [
          {
            title: strippedRecipeTitle,
          },
          {
            title: {
              // Must use startsWith for prisma to use wildcard
              startsWith: strippedRecipeTitle + " (%)",
            },
          },
        ],
      },
      ...recipeSummaryLite,
      take: MAX_DUPES_RETRIEVED,
    });

    const recipeTitles = new Set(recipes.map((recipe) => recipe.title));

    // Request may have been for "Spaghetti (3)", while "Spaghetti" is unused.
    const strippedConflict = recipeTitles.has(strippedRecipeTitle);
    if (!strippedConflict) return strippedRecipeTitle;

    let title: string | undefined;
    let count = 1;
    while (count < MAX_DUPE_RENAMES) {
      title = `${strippedRecipeTitle} (${count})`;

      const isConflict = recipeTitles.has(title);
      if (!isConflict) break;

      count++;
    }

    return title;
  });
