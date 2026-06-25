import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { prisma } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import { createDiscoverRecipeFromRecipe } from "@recipesage/util/server/db";
import { enqueueJob } from "@recipesage/util/server/general";
import { discoverRecipeContentInputSchema } from "./discoverRecipeSchemas";

export const DISCOVER_TOS_VERSION = "1";

const assertImagesOwned = async (imageIds: string[], userId: string) => {
  if (!imageIds.length) return;
  const owned = await prisma.image.count({
    where: {
      id: {
        in: imageIds,
      },
      userId,
    },
  });
  if (owned !== new Set(imageIds).size) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more images could not be found",
    });
  }
};

const assertDiscoverRecipesExist = async (ids: string[]) => {
  if (!ids.length) return;
  const found = await prisma.discoverRecipe.count({
    where: {
      id: {
        in: ids,
      },
    },
  });
  if (found !== ids.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more linked recipes could not be found",
    });
  }
};

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
