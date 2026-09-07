import * as Sentry from "@sentry/node";

import { DiscoverApprovalState, prisma } from "@recipesage/prisma";
import { enqueueJob } from "@recipesage/util/server/general";

export const remoderateStuckDiscoverRecipes = async (options: {
  minAgeMinutes: number;
  batchSize: number;
  dryRun: boolean;
}) => {
  try {
    const stuckBefore = new Date(
      Date.now() - options.minAgeMinutes * 60 * 1000,
    );
    let cursor: string | undefined;
    let count = 0;

    while (true) {
      const discoverRecipes = await prisma.discoverRecipe.findMany({
        where: {
          approvalState: DiscoverApprovalState.PENDING,
          deletedAt: null,
          createdAt: {
            lt: stuckBefore,
          },
          ...(cursor
            ? {
                id: {
                  gt: cursor,
                },
              }
            : {}),
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
        orderBy: {
          id: "asc",
        },
        take: options.batchSize,
      });

      if (!discoverRecipes.length) break;

      for (const discoverRecipe of discoverRecipes) {
        console.log(
          `${options.dryRun ? "Would enqueue" : "Enqueuing"} moderation for ${discoverRecipe.id} (published ${discoverRecipe.createdAt.toISOString()}): ${discoverRecipe.title}`,
        );

        if (!options.dryRun) {
          await enqueueJob(
            {
              discoverModeration: {
                discoverRecipeId: discoverRecipe.id,
              },
            },
            {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 5000,
              },
            },
          );
        }

        count++;
      }

      cursor = discoverRecipes[discoverRecipes.length - 1].id;
    }

    console.log(
      options.dryRun
        ? `Dry run complete, ${count} stuck discover recipes would be re-moderated`
        : `Enqueued moderation for ${count} stuck discover recipes`,
    );
  } catch (e) {
    Sentry.captureException(e);
    console.log("Error while re-moderating stuck discover recipes", e);
    throw e;
  }
};
