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

export const updateShoppingListItem = publicProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      recipeId: z.string().uuid().nullable().optional(),
      completed: z.boolean().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    if (input.title === undefined && input.recipeId === undefined && input.completed === undefined) {
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
      },
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBoardcastEventType.ShoppingListUpdated,
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
