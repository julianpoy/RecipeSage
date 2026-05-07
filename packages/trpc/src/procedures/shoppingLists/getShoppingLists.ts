import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import {
  prisma,
  shoppingListSummary,
  shoppingListSummarySchema,
} from "@recipesage/prisma";
import { z } from "zod";

export const getShoppingLists = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/shoppingLists/getShoppingLists",
      tags: ["shoppingLists"],
      summary: "Get the caller's shopping lists (without items)",
      protect: true,
    },
  })
  .output(z.array(shoppingListSummarySchema))
  .query(async ({ ctx }) => {
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
