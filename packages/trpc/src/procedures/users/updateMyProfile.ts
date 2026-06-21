import {
  prisma,
  profileItemTypeSchema,
  profileItemVisibilitySchema,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { isHandleValid, Capabilities } from "@recipesage/util/shared";
import { userHasCapability } from "@recipesage/util/server/capabilities";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const MAX_PROFILE_IMAGES = 10;

export const updateMyProfile = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/updateMyProfile",
      tags: ["users"],
      summary:
        "Update the caller's public profile, showcased items, and profile images",
      protect: true,
    },
  })
  .input(
    z.object({
      name: z.string().min(1).max(254).optional(),
      handle: z.string().min(1).max(255).optional(),
      enableProfile: z.boolean().optional(),
      profileVisibility: z.string().max(255).optional(),
      profileItems: z
        .array(
          z.object({
            title: z.string(),
            type: profileItemTypeSchema,
            recipeId: z.uuid().nullable().optional(),
            labelId: z.uuid().nullable().optional(),
            visibility: profileItemVisibilitySchema,
          }),
        )
        .optional(),
      profileImageIds: z.array(z.uuid()).optional(),
    }),
  )
  .output(z.string())
  .mutation(async ({ input, ctx }): Promise<string> => {
    const userId = ctx.session.userId;

    if (input.handle !== undefined && !isHandleValid(input.handle)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Handle must only contain A-z 0-9 _ .",
      });
    }

    const handle = input.handle?.toLowerCase();

    let allowedProfileImageIds = input.profileImageIds;
    if (input.profileImageIds && input.profileImageIds.length > 0) {
      const images = await prisma.image.findMany({
        where: {
          id: {
            in: input.profileImageIds,
          },
        },
        select: {
          id: true,
          userId: true,
          createdAt: true,
        },
      });
      const imagesById = new Map(images.map((image) => [image.id, image]));

      allowedProfileImageIds = input.profileImageIds.filter((imageId) =>
        imagesById.has(imageId),
      );

      if (allowedProfileImageIds.length > 1) {
        const canUploadMultipleImages = await userHasCapability(
          userId,
          Capabilities.MultipleImages,
        );

        if (!canUploadMultipleImages) {
          const oneDayMs = 24 * 60 * 60 * 1000;
          allowedProfileImageIds = allowedProfileImageIds.filter(
            (imageId, idx) => {
              const image = imagesById.get(imageId);
              if (!image) return false;
              return (
                idx === 0 ||
                image.userId !== userId ||
                image.createdAt.getTime() + oneDayMs < Date.now()
              );
            },
          );
        }
      }
    }

    if (allowedProfileImageIds) {
      allowedProfileImageIds = allowedProfileImageIds.slice(
        0,
        MAX_PROFILE_IMAGES,
      );
    }

    await prisma.$transaction(async (tx) => {
      if (handle !== undefined) {
        const existingUser = await tx.user.findFirst({
          where: {
            id: {
              not: userId,
            },
            handle,
          },
          select: {
            id: true,
          },
        });
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That handle is already in use by another account",
          });
        }
      }

      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(handle !== undefined ? { handle } : {}),
          ...(input.enableProfile !== undefined
            ? { enableProfile: input.enableProfile }
            : {}),
          ...(input.profileVisibility !== undefined
            ? { profileVisibility: input.profileVisibility }
            : {}),
        },
      });

      if (input.profileItems) {
        const recipeIds = input.profileItems.flatMap((profileItem) =>
          profileItem.recipeId ? [profileItem.recipeId] : [],
        );
        const labelIds = input.profileItems.flatMap((profileItem) =>
          profileItem.labelId ? [profileItem.labelId] : [],
        );

        if (recipeIds.length > 0) {
          const ownedRecipeCount = await tx.recipe.count({
            where: {
              id: { in: recipeIds },
              userId,
            },
          });
          if (ownedRecipeCount !== new Set(recipeIds).size) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "You can only pin your own recipes to your profile",
            });
          }
        }

        if (labelIds.length > 0) {
          const ownedLabelCount = await tx.label.count({
            where: {
              id: { in: labelIds },
              userId,
            },
          });
          if (ownedLabelCount !== new Set(labelIds).size) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "You can only pin your own labels to your profile",
            });
          }
        }

        await tx.profileItem.deleteMany({
          where: {
            userId,
          },
        });

        await tx.profileItem.createMany({
          data: input.profileItems.map((profileItem, idx) => ({
            userId,
            title: profileItem.title,
            type: profileItem.type,
            recipeId: profileItem.recipeId ?? null,
            labelId: profileItem.labelId ?? null,
            visibility: profileItem.visibility,
            order: idx,
          })),
        });
      }

      if (allowedProfileImageIds) {
        await tx.userProfileImage.deleteMany({
          where: {
            userId,
          },
        });

        await tx.userProfileImage.createMany({
          data: allowedProfileImageIds.map((imageId, idx) => ({
            userId,
            imageId,
            order: idx,
          })),
        });
      }
    });

    return "Updated";
  });
