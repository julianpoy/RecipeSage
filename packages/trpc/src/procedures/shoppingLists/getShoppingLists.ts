import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { prisma, shoppingListSummary } from "@recipesage/prisma";

export const getShoppingLists = publicProcedure.query(async ({ ctx }) => {
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
    ...shoppingListSummary,
    orderBy: {
      createdAt: "desc",
    },
  });

  return shoppingLists;
});
