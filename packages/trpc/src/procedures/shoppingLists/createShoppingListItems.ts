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
  categorizeShoppingListItems,
  ShoppingListCategory,
} from "@recipesage/util/server/ml";
import * as Sentry from "@sentry/node";

export const createShoppingListItems = publicProcedure
  .input(
    z.object({
      shoppingListId: z.string().uuid(),
      items: z.array(
        z.object({
          title: z.string(),
          recipeId: z.string().uuid().nullable(),
          mealPlanItemId: z.string().uuid().nullable(),
          completed: z.boolean().optional(),
          category: z.string().optional(),
        }),
      ),
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

    const categories = new Map<string, string>();
    const itemTitles = input.items.map((item) => item.title);
    try {
      const gptCategories = await categorizeShoppingListItems(itemTitles);
      for (let i = 0; i < gptCategories.length; i++) {
        if (Object.values(ShoppingListCategory).includes(gptCategories[i])) {
          categories.set(itemTitles[i], gptCategories[i]);
        } else {
          console.error(
            `Invalid category returned by GPT ${gptCategories[i]} for item with text "${itemTitles[i]}"`,
          );
          Sentry.captureMessage("Invalid category returned by GPT", {
            extra: {
              title: itemTitles[i],
              category: gptCategories[i],
            },
          });
        }
      }
    } catch (e) {
      console.error(
        `Unable to categorize shopping list items: ${itemTitles}`,
        e,
      );
      Sentry.captureException(e, {
        extra: {
          itemTitles,
        },
      });
    }

    await prisma.shoppingListItem.createMany({
      data: input.items.map((el) => ({
        shoppingListId: input.shoppingListId,
        title: el.title,
        userId: session.userId,
        recipeId: el.recipeId,
        mealPlanItemId: el.mealPlanItemId,
        completed: el.completed || false,
        category: el.category || categories.get(el.title),
      })),
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
    };
  });
