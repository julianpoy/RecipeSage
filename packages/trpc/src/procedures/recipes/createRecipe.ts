import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  Capabilities,
  MULTIPLE_IMAGES_UNLOCKED_LIMIT,
  userHasCapability,
} from "../../services/capabilities";
import { indexRecipes } from "../../services/search";

export const createRecipe = publicProcedure
  .input(
    z.object({
      title: z.string().min(1),
      description: z.string(),
      yield: z.string(),
      activeTime: z.string(),
      totalTime: z.string(),
      source: z.string(),
      url: z.string(),
      notes: z.string(),
      ingredients: z.string(),
      instructions: z.string(),
      rating: z.number().min(1).max(5).nullable(),
      folder: z.union([z.literal("main"), z.literal("inbox")]),
      labelIds: z.array(z.string()),
      imageIds: z.array(z.string()),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

    const labelIds = input.labelIds || [];
    const doesNotOwnAssignedLabel = !!(await prisma.label.findFirst({
      where: {
        id: {
          in: input.labelIds,
        },
        userId: {
          not: session.userId,
        },
      },
    }));

    if (doesNotOwnAssignedLabel) {
      throw new TRPCError({
        message: "You do not own one of the specified label ids",
        code: "FORBIDDEN",
      });
    }

    const recipeLabels = labelIds.map((labelId) => ({
      labelId,
    }));

    const imageIds = input.imageIds || [];
    const recipeImages = imageIds.map((imageId, idx) => ({
      imageId,
      order: idx,
    }));

    const multipleImagesEnabled = await userHasCapability(
      session.userId,
      Capabilities.MultipleImages,
    );
    if (multipleImagesEnabled) {
      recipeImages.splice(MULTIPLE_IMAGES_UNLOCKED_LIMIT);
    } else {
      recipeImages.splice(1);
    }

    const recipe = await prisma.recipe.create({
      data: {
        title: input.title,
        userId: session.userId,
        description: input.description,
        yield: input.yield,
        activeTime: input.activeTime,
        totalTime: input.totalTime,
        source: input.source,
        url: input.url,
        notes: input.notes,
        ingredients: input.ingredients,
        instructions: input.instructions,
        rating: input.rating,
        folder: input.folder,
        recipeLabels: {
          createMany: {
            data: recipeLabels,
          },
        },
        recipeImages: {
          createMany: {
            data: recipeImages,
          },
        },
      },
    });

    await indexRecipes([recipe]);

    return recipe;
  });
