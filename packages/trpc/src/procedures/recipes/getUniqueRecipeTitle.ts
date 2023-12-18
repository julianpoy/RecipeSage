import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { prisma } from "@recipesage/prisma";
import { stripNumberedRecipeTitle } from "../../utils/stripNumberedRecipeTitle";
import { recipeSummaryLite } from "../../types/recipeSummaryLite";
import { validateSession } from "../../utils/validateSession";

/**
 * An arbitrary upper limit for rename attempts so we don't spin forever
 */
const MAX_DUPE_RENAMES = 100;
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
    validateSession(session);

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

    // Request may have been for "Spaghetti (3)", while "Spaghetti" is unused.
    const strippedConflict = recipes.some(
      (recipe) => recipe.title === strippedRecipeTitle,
    );
    if (!strippedConflict) return strippedRecipeTitle;

    let title: string | undefined;
    let count = 1;
    while (count < MAX_DUPE_RENAMES) {
      title = `${strippedRecipeTitle} (${count})`;

      const isConflict = recipes.some((recipe) => recipe.title === title);
      if (!isConflict) break;

      count++;
    }

    return title;
  });
