import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { prisma, UserDiscoverStanding } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import { createDiscoverRecipeFromRecipe } from "@recipesage/util/server/db";
import { enqueueJob } from "@recipesage/util/server/general";
import {
  assertCanPublishDiscover,
  assertImagesOwned,
  assertDiscoverRecipesExist,
} from "@recipesage/util/server/trpc";
import { discoverRecipeContentInputSchema } from "./discoverRecipeSchemas";

export const DISCOVER_TOS_VERSION = "1";

const MAX_DISCOVER_PUBLISHES_PER_DAY = 5;
const PUBLISH_WINDOW_MS = 24 * 60 * 60 * 1000;

export const publishDiscoverRecipe = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/discover/publishDiscoverRecipe",
      tags: ["discover"],
      summary: "Publish one of your recipes to the public discover catalog",
      protect: true,
    },
  })
  .input(
    z.object({
      recipeId: z.uuid(),
      content: discoverRecipeContentInputSchema,
      language: z.string().min(1).max(35),
      imageIds: z.array(z.uuid()).max(10),
      linkedDiscoverRecipeIds: z.array(z.uuid()).max(25),
      agreedToTos: z.literal(true),
    }),
  )
  .output(
    z.object({
      id: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await assertCanPublishDiscover(ctx.session.userId);

    const author = await prisma.user.findUnique({
      where: {
        id: ctx.session.userId,
      },
      select: {
        discoverStanding: true,
      },
    });
    if (author?.discoverStanding !== UserDiscoverStanding.TRUSTED) {
      const recentPublishCount = await prisma.discoverRecipe.count({
        where: {
          authorId: ctx.session.userId,
          createdAt: {
            gte: new Date(Date.now() - PUBLISH_WINDOW_MS),
          },
        },
      });
      if (recentPublishCount >= MAX_DISCOVER_PUBLISHES_PER_DAY) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `You can publish at most ${MAX_DISCOVER_PUBLISHES_PER_DAY} recipes to Discover per day. Please try again later.`,
        });
      }
    }

    const sourceRecipe = await prisma.recipe.findFirst({
      where: {
        id: input.recipeId,
        userId: ctx.session.userId,
      },
      select: {
        id: true,
        source: true,
        url: true,
      },
    });

    if (!sourceRecipe) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find that recipe",
      });
    }

    if (sourceRecipe.source || sourceRecipe.url) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Recipes that originate from an external source cannot be published to discover",
      });
    }

    await assertImagesOwned(input.imageIds, ctx.session.userId);

    const linkedIds = [...new Set(input.linkedDiscoverRecipeIds)];
    await assertDiscoverRecipesExist(linkedIds);

    const persistDiscoverRecipe = createDiscoverRecipeFromRecipe({
      sourceRecipeId: sourceRecipe.id,
      authorId: ctx.session.userId,
      content: input.content,
      language: input.language.trim().toLowerCase(),
      tosVersion: DISCOVER_TOS_VERSION,
      imageIds: input.imageIds,
    });

    const discoverRecipe = await prisma.$transaction(async (tx) => {
      const created = await persistDiscoverRecipe(tx);

      if (linkedIds.length) {
        await tx.discoverRecipeLink.createMany({
          data: linkedIds.map((linkedDiscoverRecipeId) => ({
            discoverRecipeId: created.id,
            linkedDiscoverRecipeId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    await enqueueJob({
      discoverModeration: {
        discoverRecipeId: discoverRecipe.id,
      },
    });

    return {
      id: discoverRecipe.id,
    };
  });
