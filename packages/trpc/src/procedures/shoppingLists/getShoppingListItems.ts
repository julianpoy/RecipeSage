import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { prisma, shoppingListItemSummary } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";

export const getShoppingListItems = publicProcedure
  .input(
    z.object({
      shoppingListId: z.string().uuid(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToShoppingList(
      session.userId,
      input.shoppingListId,
    );

    if (access.level === ShoppingListAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shopping list not found or you do not have access",
      });
    }

    const shoppingListItems = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId: input.shoppingListId,
      },
      ...shoppingListItemSummary,
      orderBy: {
        createdAt: "desc",
      },
    });

    return shoppingListItems;
  });
