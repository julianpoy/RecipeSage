import { publicProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";
import { SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT } from "@recipesage/util/shared";

/** @deprecated Use updateShoppingListItems instead */
export const updateShoppingListItem = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/shoppingLists/updateShoppingListItem",
      tags: ["shoppingLists"],
      summary: "Update a single shopping list item (deprecated)",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      title: z
        .string()
        .min(1)
        .max(SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT)
        .optional(),
      recipeId: z.uuid().nullable().optional(),
      completed: z.boolean().optional(),
      categoryTitle: z.string().optional(),
    }),
  )
  .output(
    z.object({
      reference: z.uuid(),
      id: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    if (
      input.title === undefined &&
      input.recipeId === undefined &&
      input.completed === undefined &&
      input.categoryTitle === undefined
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You must specify at least one property to update",
      });
    }

    const shoppingListItem = await prisma.shoppingListItem.findUnique({
      where: {
        id: input.id,
      },
      select: {
        shoppingListId: true,
      },
    });

    if (!shoppingListItem) {
      throw new TRPCError({
        code: "NOT_FOUND",
      });
    }

    const access = await getAccessToShoppingList(
      session.userId,
      shoppingListItem.shoppingListId,
    );

    if (access.level === ShoppingListAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Shopping list with that id does not exist or you do not have access",
      });
    }

    const updatedShoppingListItem = await prisma.shoppingListItem.update({
      where: {
        id: input.id,
      },
      data: {
        title: input.title,
        recipeId: input.recipeId,
        completed: input.completed,
        categoryTitle: input.categoryTitle,
      },
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBroadcastEventType.ShoppingListUpdated,
        {
          reference,
          shoppingListId: shoppingListItem.shoppingListId,
        },
      );
    }

    return {
      reference,
      id: updatedShoppingListItem.id,
    };
  });
