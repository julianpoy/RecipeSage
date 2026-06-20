import {
  prisma,
  messageSummary,
  messageSummarySchema,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  convertPrismaMessageToMessageSummary,
  shareRecipeToUser,
} from "@recipesage/util/server/db";
import { dispatchMessageNotification } from "@recipesage/util/server/general";
import { indexRecipes } from "@recipesage/util/server/search";

export const createMessage = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/messages/createMessage",
      tags: ["messages"],
      summary: "Send a message to another user, optionally sharing a recipe",
      protect: true,
    },
  })
  .input(
    z.object({
      to: z.uuid(),
      body: z.string().optional(),
      recipeId: z.uuid().optional(),
    }),
  )
  .output(messageSummarySchema)
  .mutation(async ({ ctx, input }) => {
    if (!input.recipeId && !input.body) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "recipeId or body is required",
      });
    }

    const [recipient, sender] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: input.to,
        },
        select: {
          id: true,
          name: true,
          handle: true,
          fcmTokens: {
            select: {
              token: true,
            },
          },
        },
      }),
      prisma.user.findUniqueOrThrow({
        where: {
          id: ctx.session.userId,
        },
        select: {
          id: true,
          name: true,
          handle: true,
        },
      }),
    ]);

    if (!recipient) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find user under that ID.",
      });
    }

    const persistSharedRecipe = input.recipeId
      ? await shareRecipeToUser(input.recipeId, input.to)
      : null;
    if (input.recipeId && !persistSharedRecipe) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find recipe to share",
      });
    }

    const { fullMessage, sharedRecipe } = await prisma.$transaction(
      async (tx) => {
        const sharedRecipe = persistSharedRecipe
          ? await persistSharedRecipe(tx)
          : null;

        const fullMessage = await tx.message.create({
          data: {
            fromUserId: ctx.session.userId,
            toUserId: input.to,
            body: input.body ?? "",
            recipeId: sharedRecipe?.id,
            originalRecipeId: input.recipeId ?? null,
          },
          ...messageSummary,
        });

        return { fullMessage, sharedRecipe };
      },
    );

    if (sharedRecipe) {
      await indexRecipes([sharedRecipe]);
    }

    const message = convertPrismaMessageToMessageSummary(fullMessage);

    await dispatchMessageNotification(
      {
        id: recipient.id,
        name: recipient.name,
        handle: recipient.handle,
        fcmTokens: recipient.fcmTokens.map((fcmToken) => fcmToken.token),
      },
      {
        id: sender.id,
        name: sender.name,
        handle: sender.handle,
      },
      message,
    );

    return message;
  });
