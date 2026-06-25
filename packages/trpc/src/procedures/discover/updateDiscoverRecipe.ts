import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { prisma, DiscoverApprovalState } from "@recipesage/prisma";
import { TRPCError } from "@trpc/server";
import { enqueueJob } from "@recipesage/util/server/general";
import { discoverRecipeContentInputSchema } from "./discoverRecipeSchemas";

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

export const updateDiscoverRecipe = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/discover/updateDiscoverRecipe",
      tags: ["discover"],
      summary: "Edit one of your published discover recipes",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      content: discoverRecipeContentInputSchema,
      language: z.string().min(1).max(35),
      imageIds: z.array(z.uuid()).max(10),
      linkedDiscoverRecipeIds: z.array(z.uuid()).max(25),
    }),
  )
  .output(
    z.object({
      id: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const existing = await prisma.discoverRecipe.findFirst({
      where: {
        id: input.id,
        authorId: ctx.session.userId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find that discover recipe",
      });
    }

    await assertImagesOwned(input.imageIds, ctx.session.userId);

    const linkedIds = [...new Set(input.linkedDiscoverRecipeIds)].filter(
      (id) => id !== existing.id,
    );
    await assertDiscoverRecipesExist(linkedIds);

    await prisma.$transaction(async (tx) => {
      await tx.discoverRecipe.update({
        where: {
          id: existing.id,
        },
        data: {
          ...input.content,
          language: input.language.trim().toLowerCase(),
          approvalState: DiscoverApprovalState.PENDING,
          modifiedAt: new Date(),
        },
      });

      await tx.discoverRecipeImage.deleteMany({
        where: {
          discoverRecipeId: existing.id,
        },
      });

      if (input.imageIds.length) {
        await tx.discoverRecipeImage.createMany({
          data: input.imageIds.map((imageId, index) => ({
            discoverRecipeId: existing.id,
            imageId,
            order: index,
          })),
        });
      }

      const existingLinks = await tx.discoverRecipeLink.findMany({
        where: {
          discoverRecipeId: existing.id,
        },
        select: {
          linkedDiscoverRecipeId: true,
        },
      });
      const existingLinkedIds = new Set(
        existingLinks.map((link) => link.linkedDiscoverRecipeId),
      );

      const linkedIdsToRemove = [...existingLinkedIds].filter(
        (id) => !linkedIds.includes(id),
      );
      const linkedIdsToAdd = linkedIds.filter(
        (id) => !existingLinkedIds.has(id),
      );

      if (linkedIdsToRemove.length) {
        await tx.discoverRecipeLink.deleteMany({
          where: {
            discoverRecipeId: existing.id,
            linkedDiscoverRecipeId: {
              in: linkedIdsToRemove,
            },
          },
        });
      }

      if (linkedIdsToAdd.length) {
        await tx.discoverRecipeLink.createMany({
          data: linkedIdsToAdd.map((linkedDiscoverRecipeId) => ({
            discoverRecipeId: existing.id,
            linkedDiscoverRecipeId,
          })),
          skipDuplicates: true,
        });
      }
    });

    await enqueueJob({
      discoverModeration: {
        discoverRecipeId: existing.id,
      },
    });

    return {
      id: existing.id,
    };
  });
