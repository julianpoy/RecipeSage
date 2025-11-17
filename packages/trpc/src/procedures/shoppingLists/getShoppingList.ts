import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { prisma, shoppingListSummary } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";

export const getShoppingList = publicProcedure
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const access = await getAccessToShoppingList(session.userId, input.id);

    if (access.level === ShoppingListAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shopping list not found or you do not have access",
      });
    }

    const shoppingList = await prisma.shoppingList.findUniqueOrThrow({
      where: {
        id: input.id,
      },
      ...shoppingListSummary,
    });

    return shoppingList;
  });
