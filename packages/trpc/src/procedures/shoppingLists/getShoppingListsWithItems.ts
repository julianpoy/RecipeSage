import { publicProcedure } from "../../trpc";
import {
  getShoppingListItemGroupTitles,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import {
  prisma,
  prismaShoppingListSummaryWithItemsToShoppingListItemSummaryWithItems,
  shoppingListSummaryWithItems,
} from "@recipesage/prisma";

export const getShoppingListsWithItems = publicProcedure.query(
  async ({ ctx }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const collabRelationships = await prisma.shoppingListCollaborator.findMany({
      where: {
        userId: session.userId,
      },
      select: {
        shoppingListId: true,
      },
    });

    const shoppingLists = await prisma.shoppingList.findMany({
      where: {
        OR: [
          {
            userId: session.userId,
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
  },
);
