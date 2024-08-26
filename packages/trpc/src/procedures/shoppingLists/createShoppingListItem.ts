import { publicProcedure } from "../../trpc";
import {
  WSBoardcastEventType,
  broadcastWSEvent,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";
import {
  categorizeShoppingListItem,
  ShoppingListCategory,
} from "@recipesage/util/server/ml";
import * as Sentry from "@sentry/node";

export const createShoppingListItem = publicProcedure
  .input(
    z.object({
      shoppingListId: z.string().uuid(),
      title: z.string(),
      recipeId: z.string().uuid().nullable(),
      mealPlanItemId: z.string().uuid().nullable(),
      completed: z.boolean().optional(),
      category: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToShoppingList(
      session.userId,
      input.shoppingListId,
    );

    if (access.level === ShoppingListAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Shopping list with that id does not exist or you do not have access",
      });
    }

    let category = input.category;
    if (!category) {
      try {
        const gptCategory = await categorizeShoppingListItem(input.title);
        if (Object.values(ShoppingListCategory).includes(gptCategory)) {
          category = gptCategory;
        } else {
          console.error(
            `Invalid category returned by GPT ${category} for item with text "${input.title}"`,
          );
          Sentry.captureMessage("Invalid category returned by GPT", {
            extra: {
              title: input.title,
              category: gptCategory,
            },
          });
        }
      } catch (e) {
        console.error(
          `Unable to categorize shopping list item: ${input.title}`,
          e,
        );
        Sentry.captureException(e, {
          extra: {
            title: input.title,
          },
        });
      }
    }

    const createdShoppingListItem = await prisma.shoppingListItem.create({
      data: {
        shoppingListId: input.shoppingListId,
        title: input.title,
        userId: session.userId,
        recipeId: input.recipeId,
        mealPlanItemId: input.mealPlanItemId,
        completed: input.completed || false,
        category,
      },
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEvent(subscriberId, WSBoardcastEventType.ShoppingListUpdated, {
        reference,
        shoppingListId: input.shoppingListId,
      });
    }

    return {
      reference,
      id: createdShoppingListItem.id,
    };
  });
