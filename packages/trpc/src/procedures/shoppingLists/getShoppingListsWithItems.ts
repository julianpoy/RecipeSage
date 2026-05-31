import { authenticatedProcedure } from "../../trpc";
import { getShoppingListItemGroupTitles } from "@recipesage/util/server/general";
import {
  prisma,
  prismaShoppingListSummaryWithItemsToShoppingListItemSummaryWithItems,
  shoppingListSummaryWithItems,
  shoppingListSummaryWithItemsSchema,
} from "@recipesage/prisma";
import { z } from "zod";

export const getShoppingListsWithItems = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/shoppingLists/getShoppingListsWithItems",
      tags: ["shoppingLists"],
      summary: "Get the caller's shopping lists, including items",
      protect: true,
    },
  })
  .output(z.array(shoppingListSummaryWithItemsSchema))
  .query(async ({ ctx }) => {
    const collabRelationships = await prisma.shoppingListCollaborator.findMany({
      where: {
        userId: ctx.session.userId,
      },
      select: {
        shoppingListId: true,
      },
    });

    const shoppingLists = await prisma.shoppingList.findMany({
      where: {
        OR: [
          {
            userId: ctx.session.userId,
          },
          {
            id: {
              in: collabRelationships.map((el) => el.shoppingListId),
            },
          },
        ],
      },
      ...shoppingListSummaryWithItems,
      orderBy: {
        createdAt: "desc",
      },
    });

    const summaries = shoppingLists.map((shoppingList) => {
      const itemsWithGroupTitle = getShoppingListItemGroupTitles(
        shoppingList.items,
      );
      return prismaShoppingListSummaryWithItemsToShoppingListItemSummaryWithItems(
        shoppingList,
        itemsWithGroupTitle,
      );
    });

    return summaries;
  });
