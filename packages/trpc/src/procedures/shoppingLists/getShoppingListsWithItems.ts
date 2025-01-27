import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { prisma, shoppingListSummaryWithItems } from "@recipesage/prisma";

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

    return shoppingLists;
  },
);
