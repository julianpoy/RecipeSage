import { publicProcedure } from "../../trpc";
import {
  WSBoardcastEventType,
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

export const updateShoppingListItems = publicProcedure
  .input(
    z.object({
      shoppingListId: z.uuid(),
      items: z
        .array(
          z.object({
            id: z.uuid(),
            title: z.string().min(1).max(254).optional(),
            recipeId: z.uuid().nullable().optional(),
            completed: z.boolean().optional(),
            categoryTitle: z.string().optional(),
          }),
        )
        .min(1)
        .max(100), // These will be individual DB calls, so cap number of allowed items
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const shoppingListItems = await prisma.shoppingListItem.findMany({
      where: {
        id: {
          in: input.items.map((el) => el.id),
        },
        shoppingListId: input.shoppingListId,
      },
      select: {
        id: true,
      },
    });

    if (shoppingListItems.length !== input.items.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "One or more of the items you've passed do not exist, or do not belong to the shopping list id",
      });
    }

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

    await prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        if (
          item.title === undefined &&
          item.recipeId === undefined &&
          item.completed === undefined &&
          item.categoryTitle === undefined
        ) {
          continue;
        }

        await tx.shoppingListItem.update({
          where: {
            id: item.id,
          },
          data: {
            title: item.title,
            recipeId: item.recipeId,
            completed: item.completed,
            categoryTitle: item.categoryTitle,
          },
        });
      }
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
    };
  });
