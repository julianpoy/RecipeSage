import { publicProcedure } from "../../trpc";
import {
  WSBoardcastEventType,
  broadcastWSEventIgnoringErrors,
  getShoppingListItemCategories,
  getShoppingListItemGroupTitle,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";

export const createShoppingListItem = publicProcedure
  .input(
    z.object({
      shoppingListId: z.string().uuid(),
      title: z.string(),
      recipeId: z.string().uuid().nullable(),
      completed: z.boolean().optional(),
      categoryTitle: z.string().optional(),
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

    const categoryTitle = input.categoryTitle ? input.categoryTitle : (
      `::${await getShoppingListItemCategories([input.title])}`
    );

    const createdShoppingListItem = await prisma.shoppingListItem.create({
      data: {
        shoppingListId: input.shoppingListId,
        title: input.title,
        userId: session.userId,
        recipeId: input.recipeId,
        completed: input.completed ?? false,
        categoryTitle,
      },
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBoardcastEventType.ShoppingListUpdated,
        {
          reference,
          shoppingListId: input.shoppingListId,
        },
      );
    }

    return {
      reference,
      id: createdShoppingListItem.id,
    };
  });
