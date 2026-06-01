import { authenticatedProcedure } from "../../trpc";
import { getShoppingListItemGroupTitles } from "@recipesage/util/server/general";
import {
  prisma,
  ShoppingListItemSummary,
  shoppingListItemSummary,
  shoppingListItemSummarySchema,
} from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";

export const getShoppingListItems = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/shoppingLists/getShoppingListItems",
      tags: ["shoppingLists"],
      summary: "Get the items belonging to a shopping list",
      protect: true,
    },
  })
  .input(
    z.object({
      shoppingListId: z.uuid(),
    }),
  )
  .output(z.array(shoppingListItemSummarySchema))
  .query(async ({ ctx, input }) => {
    const access = await getAccessToShoppingList(
      ctx.session.userId,
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

    const summaries = getShoppingListItemGroupTitles(
      shoppingListItems,
    ) satisfies ShoppingListItemSummary[];

    return summaries;
  });
