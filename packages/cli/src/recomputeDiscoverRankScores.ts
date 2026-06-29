import * as Sentry from "@sentry/node";

import { Prisma, prisma } from "@recipesage/prisma";
import {
  computeDiscoverRankScore,
  getDiscoverDistinctSaverCounts,
} from "@recipesage/util/server/db";

export const recomputeDiscoverRankScores = async (options: {
  batchSize: number;
}) => {
  try {
    const now = new Date();
    let cursor: string | undefined;
    let processed = 0;

    while (true) {
      const discoverRecipes = await prisma.discoverRecipe.findMany({
        select: {
          id: true,
          createdAt: true,
          ratingAverage: true,
          ratingCount: true,
        },
        orderBy: {
          id: "asc",
        },
        take: options.batchSize,
        ...(cursor
          ? {
              skip: 1,
              cursor: {
                id: cursor,
              },
            }
          : {}),
      });

      if (!discoverRecipes.length) break;

      const saverCounts = await getDiscoverDistinctSaverCounts(
        discoverRecipes.map((discoverRecipe) => discoverRecipe.id),
      );

      const valueTuples = discoverRecipes.map((discoverRecipe) => {
        const saveCount = saverCounts.get(discoverRecipe.id) ?? 0;
        const rankScore = computeDiscoverRankScore({
          createdAt: discoverRecipe.createdAt,
          saveCount,
          ratingAverage: discoverRecipe.ratingAverage,
          ratingCount: discoverRecipe.ratingCount,
          now,
        });
        return Prisma.sql`(${discoverRecipe.id}::uuid, ${saveCount}::integer, ${rankScore}::double precision)`;
      });

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "Discover_Recipes" AS d
        SET "saveCount" = v.saveCount, "rankScore" = v.rankScore
        FROM (VALUES ${Prisma.join(valueTuples)}) AS v(id, saveCount, rankScore)
        WHERE d.id = v.id
      `);

      processed += discoverRecipes.length;
      cursor = discoverRecipes[discoverRecipes.length - 1].id;
      console.log(`Recomputed rank scores for ${processed} discover recipes`);
    }

    console.log("Discover rank score recompute complete!");
  } catch (e) {
    Sentry.captureException(e);
    console.log("Error while recomputing discover rank scores", e);
    throw e;
  }
};
