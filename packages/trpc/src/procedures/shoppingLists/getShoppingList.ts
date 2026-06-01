import { authenticatedProcedure } from "../../trpc";
import {
  prisma,
  shoppingListSummary,
  shoppingListSummarySchema,
} from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ShoppingListAccessLevel,
  getAccessToShoppingList,
} from "@recipesage/util/server/db";

export const getShoppingList = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/shoppingLists/getShoppingList",
      tags: ["shoppingLists"],
      summary: "Get a single shopping list by id",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(shoppingListSummarySchema)
  .query(async ({ ctx, input }) => {
    const access = await getAccessToShoppingList(ctx.session.userId, input.id);

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
